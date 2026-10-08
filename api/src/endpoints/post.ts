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

const MEDIA_BUCKET = 'post_medias';

/**
 * Put one uploaded file in the bucket and hand back its public URL.
 *
 * Objects are keyed by post id and content hash, so re-posting the same file is
 * idempotent. `pid` is a uuid — it must not be run through parseInt.
 */
async function uploadPostMedia(pid: string, m: any, mt: "image" | "video") {
    const filehash = crypto
        .createHash('md5')
        .update(m.buffer)
        .digest('hex');
    const ext = path.extname(m.originalname);
    const objectPath = `${pid}/${mt}s/${filehash}${ext}`;

    const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(objectPath, m.buffer, { contentType: m.mimetype, upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);
    return { post_id: pid, file_url: publicUrl, media_type: mt };
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

        // multer only populates req.files for multipart requests; a JSON body
        // (what the composer sends today) skips this block entirely.
        const files = req.files as Record<string, any[]> | undefined;
        const images = files?.['images'] ?? [];
        const videos = files?.['videos'] ?? [];

        if (images.length || videos.length) {
            const rows = await Promise.all([
                ...images.map((img) => uploadPostMedia(data.id, img, "image")),
                ...videos.map((vid) => uploadPostMedia(data.id, vid, "video")),
            ]);

            // Media lives in its own table — `posts` has no media column.
            const { error: merr } = await supabase.from('media').insert(rows);
            if (merr) throw merr;
        }

        res.status(200).json({ id: data.id });
    } catch (error: any) {
        res.status(500).json({ code: error?.code, message: error?.message });
    }
})

/**
 * v_post_all_data carries the total reaction_count but nothing about who reacted,
 * so a signed-in reader's own reaction is stitched on here in one extra query.
 * Logged-out readers just get my_reaction: null.
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
            .limit(5);
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

router.post("/post/:pid/react", auth, async (req: Request, res: Response) => {
    const { pid } = req.params;
    const { reaction_type } = req.body;

    // null clears the reaction; anything else must be a real enum member, or
    // Postgres rejects the insert with 22P02 further down.
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
