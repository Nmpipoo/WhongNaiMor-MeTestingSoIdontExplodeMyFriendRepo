import { Request, Response, NextFunction } from "express";
import supabase from "./db";

export async function auth(req: Request, res: Response, next: NextFunction) {
    // headers -> authorization: "Bearer <token>"
    const access_token = req.headers.authorization?.split(" ")[1];
    const user = await supabase.auth.getUser(access_token)
    if(user && user.data.user) {
        req.user = user.data.user;
        req.userId = user.data.user.id;
        next();
    } else {
        res.status(401).json({ message: "Unauthorized request" });
    }
}