import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { subscribe, config } from "@fal-ai/serverless-client";

if (!admin.apps.length) {
    admin.initializeApp();
}

export const processAiImage = onCall({
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: true,
    invoker: "public",
    secrets: ["FAL_KEY"]
}, async (request) => {
    const { imageUrl, promptStyle } = request.data;
    if (!imageUrl) {
        throw new HttpsError("invalid-argument", "Falta la URL de la imagen");
    }

    // 1. Create a unique cache key based on the image base64 and chosen style
    const CACHE_VERSION = "v9_strength_0.95";
    const cacheKey = crypto.createHash("md5").update(imageUrl + promptStyle + CACHE_VERSION).digest("hex");
    const db = admin.firestore();
    const cacheRef = db.collection("ai_images_cache").doc(cacheKey);

    try {
        // 2. Check if we already processed this exact image + style
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists && cacheSnap.data()?.permanentUrl) {
            logger.info("Serving from cache for key:", cacheKey);
            return { success: true, output: [cacheSnap.data()?.permanentUrl] };
        }

        // 3. Setup y llamada a Fal.ai
        config({
            credentials: process.env.FAL_KEY || ""
        });
        // Define detailed prompts for each style
        const STYLE_PROMPTS: Record<string, string> = {
            'Neon': 'Cyberpunk style, neon lights, glowing colors, highly detailed, 8k resolution, futuristic',
            'Watercolor': 'Soft watercolor painting, artistic brush strokes, pastel colors, dreamlike atmosphere, fluid textures',
            'Oil': 'Classical oil painting, heavy texture, rich colors, impasto technique, museum quality, dramatic lighting',
            'Sketch': 'Hand-drawn pencil sketch, charcoal lines, artistic shading, graphite texture, white paper background',
            'Comic': 'Pop art comic book style, bold outlines, Ben-Day dots, vibrant colors'
        };

        const actualPrompt = STYLE_PROMPTS[promptStyle] || promptStyle;
        const finalPrompt = ` ${actualPrompt} style. `;

        logger.info("Iniciando proceso con Fal.ai para nueva imagen");
        const result = await subscribe("fal-ai/flux/dev/image-to-image", {
            input: {
                image_url: imageUrl,
                prompt: finalPrompt,
                strength: 0.95,
                enable_safety_checker: false
            }
        }) as any;

        const rawOutputUrl = result?.images?.[0]?.url;
        if (!rawOutputUrl) {
            throw new Error("No URL returned from Fal.ai");
        }

        // 3. Download the generated image from Replicate so it doesn't expire
        const imageRes = await fetch(rawOutputUrl);
        if (!imageRes.ok) throw new Error("Failed to fetch generated image from Replicate");
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 4. Upload it permanently to Firebase Storage
        const { getDownloadURL } = require("firebase-admin/storage");
        const bucketName = process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : 'new-frames-703a6.firebasestorage.app';
        const bucket = admin.storage().bucket(bucketName);
        const filePath = `cached_ai_images/${cacheKey}.jpg`;
        const file = bucket.file(filePath);
        await file.save(buffer, { contentType: "image/jpeg" });

        // Retrieve public URL using Admin SDK (generates token)
        const permanentUrl = await getDownloadURL(file);

        // 5. Save the cache details in Firestore
        await cacheRef.set({
            originalHash: cacheKey,
            style: promptStyle,
            permanentUrl: permanentUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, output: [permanentUrl] };
    } catch (error: any) {
        logger.error("Error en Replicate:", error);
        throw new HttpsError("internal", error.message || "Error en IA");
    }
});

import { onRequest } from "firebase-functions/v2/https";
export const setCors = onRequest(async (req, res) => {
    try {
        const bucketName = process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : 'new-frames-703a6.firebasestorage.app';
        const bucket = admin.storage().bucket(bucketName);
        await bucket.setCorsConfiguration([
            {
                origin: ["*"],
                method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
                maxAgeSeconds: 3600
            }
        ]);
        res.status(200).send("CORS successfully configured for bucket: " + bucketName);
    } catch (e: any) {
        res.status(500).send("Error setting CORS: " + e.message);
    }
});