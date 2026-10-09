import { Request, Response, Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { Post } from "../model";
import supabase from "../db";
import path from "path";
import { auth, optionalAuth } from "../middleware";
import {
    POST_TARGET, REACTION_TYPES, isReactionType, myReactions, setReaction,
} from "../reactions";

const router = Router();
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 },
    storage: multer.memoryStorage(),
})

async function uploadPostMedia(pid: Post['id'], m: any, mt: "images" | "videos") {
    // Generate file hash and path
    const filehash = crypto
        .createHash('md5')
        .update(m.buffer)
        .digest('hex');
    const ext = path.extname(m.originalname);
    const fileName = `/${parseInt(pid)}/${mt}s/${filehash}${ext}`;
    const { data, error } = await supabase.storage
        .from('post_medias')
        .upload(fileName, m.buffer, {
            contentType: m.mimetype,
            upsert: true
        });
    if(error) throw error;
    return data;
}

router.post("/post/create", 
    auth,
    upload.fields([{ name: "images", maxCount: 10 }, { name: "videos", maxCount: 1 }]), 
    async (req: Request, res: Response) => {
    const { user_id, title, content, is_important, category_id }: Post = req.body;

    // const postdata: Post = req.body;
    try {
        // INSERT INTO posts VALUES(id, user_id, title, content, is_important);
        const { data, error } = await supabase
            .from('posts')
            .insert({ user_id, title, content, is_important })
            // .insert(postdata)
            .select()
            .single();
        
        if (error) throw error;

        // INSERT INTO post_categories VALUES(pid, cid);
        const { data: cd, error: cderr } = await supabase
            .from('post_categories')
            .insert(category_id.map((cid) => ({ post_id: data.id, category_id: cid })))
            .select();
        
        if (cderr) throw cderr;
        
        if(req.files) {
            const uploadedImgs = await Promise.all(req.files?['images']: [].map((img) => uploadPostMedia(data.id, img, "images")));
            const uploadedVids = await Promise.all(req.files?['videos']: [].map((vid) => uploadPostMedia(data.id, vid, "videos")));

            const imgsURL = uploadedImgs.map((img) => {
                // Get public URL
                const { data: { publicUrl } } = supabase!.storage
                    .from('post_medias')
                    .getPublicUrl((img as any).path);
                return publicUrl;
            })

            const vidsURL = uploadedVids.map((vid) => {
                // Get public URL
                const { data: { publicUrl } } = supabase!.storage
                    .from('post_medias')
                    .getPublicUrl((vid as any).path);
                return publicUrl;
            })

            const { data: data2, error: error2 } = await supabase
                .from('posts')
                .update({ media: [...imgsURL, ...vidsURL] })
                .eq('id', data.id);
            
            if (error2) throw error2;
        }

    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
    res.status(200).send();
})

/**
 * v_post_all_data carries the total reaction_count but nothing about who
 * reacted, so a signed-in reader's own reaction is stitched on here in one
 * extra query. Logged-out readers just get my_reaction: null.
 *
 * It cannot live in the view: the API connects with the service_role key, so
 * auth.uid() inside a view is always NULL and only this layer knows the caller.
 */
async function withMyReaction(posts: any[], userId?: string) {
    if (!userId || !posts?.length) {
        return (posts ?? []).map((p) => ({ ...p, my_reaction: null }));
    }
    const mine = await myReactions(POST_TARGET, posts.map((p) => p.id), userId);
    return posts.map((p) => ({ ...p, my_reaction: mine[p.id] ?? null }));
}

router.get("/post/fetch", optionalAuth, async (req: Request, res: Response) => {
    try {
        // SELECT * FROM posts ORDER BY posts.created_at DESC LIMIT 5
        const { data: normalpost, error: error2 } = await supabase
            .from('v_post_all_data')
            .select("*")
            .order('created_at', { ascending: false })
            // .limit(5);
        if (error2) throw error2;
        res.status(200).json(await withMyReaction(normalpost ?? [], req.userId));
    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
})

router.get("/post/fetch/announcement", optionalAuth, async (req: Request, res: Response) => {
    try {
        const { data: announcement, error: error1 } = await supabase
            .from('v_post_all_data')
            .select("*")
            .eq('is_important', true)
            .order('created_at', { ascending: false })
            .limit(5);
        if (error1) throw error1;
        res.status(200).json(await withMyReaction(announcement ?? [], req.userId));
    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
})

router.get("/post/fetch/notification", async (req: Request, res: Response) => {
    try {
        const { data: announcement, error: error1 } = await supabase
            .from('v_notification') // post + notification
            .select("*")
            .order('notified_at', { ascending: false })
            .limit(5);
        if (error1) throw error1;
        res.status(200).json(announcement);
    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
})

/**
 * Toggle this user's reaction on one post.
 *
 * `auth` is required: without it req.userId is undefined, supabase-js drops the
 * key, and PostgREST answers PGRST202 for a react_to_post(pid, rtype) overload
 * that does not exist.
 *
 * The rows are written directly rather than through the react_to_post RPC. That
 * function fails with 42804 — it feeds `rtype` as text into the enum column
 * without a cast — and repairing it needs DDL access to the Supabase project.
 * The route and its request body are unchanged; only the implementation moved.
 */
router.post("/post/:pid/react", auth, async (req: Request, res: Response) => {
    const { pid } = req.params;
    const { reaction_type } = req.body;

    // null clears the reaction; anything else must be a real enum member.
    if (reaction_type !== null && !isReactionType(reaction_type)) {
        return res.status(400).json({
            message: `reaction_type must be null or one of: ${REACTION_TYPES.join(", ")}`,
        });
    }

    try {
        const result = await setReaction(POST_TARGET, pid as string, req.userId!, reaction_type);
        res.status(200).json(result); // { reaction_count, my_reaction }
    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
})

// router.post("/post/search/category", async (req: Request, res: Response) => {
    
// }) 

export default router;
