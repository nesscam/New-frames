import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

if (!admin.apps.length) {
    admin.initializeApp();
}

export const processAiImage = onCall({
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: ["http://localhost:4200"],
    invoker: "public",
    secrets: ["REPLICATE_API_TOKEN"]
}, async (request) => {
    const { imageUrl, promptStyle } = request.data;
    if (!imageUrl) {
        throw new HttpsError("invalid-argument", "Falta la URL de la imagen");
    }

    // 1. Create a unique cache key based on the image base64 and chosen style
    const cacheKey = crypto.createHash("md5").update(imageUrl + promptStyle).digest("hex");
    const db = admin.firestore();
    const cacheRef = db.collection("ai_images_cache").doc(cacheKey);

    try {
        // 2. Check if we already processed this exact image + style
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists && cacheSnap.data()?.permanentUrl) {
            logger.info("Serving from cache for key:", cacheKey);
            return { success: true, output: [cacheSnap.data()?.permanentUrl] };
        }

        // Importamos Replicate DENTRO para que el contenedor inicie más rápido
        const { default: Replicate } = await import("replicate");
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        // Define detailed prompts for each style
        const STYLE_PROMPTS: Record<string, string> = {
            'Neon': 'Cyberpunk style, neon lights, glowing colors, highly detailed, 8k resolution, futuristic',
            'Watercolor': 'Soft watercolor painting, artistic brush strokes, pastel colors, dreamlike atmosphere, fluid textures',
            'Oil': 'Classical oil painting, heavy texture, rich colors, impasto technique, museum quality, dramatic lighting',
            'Sketch': 'Hand-drawn pencil sketch, charcoal lines, artistic shading, graphite texture, white paper background',
            'Comic': 'Pop art comic book style, bold outlines, Ben-Day dots, vibrant colors, superhero aesthetic'
        };

        const actualPrompt = STYLE_PROMPTS[promptStyle] || promptStyle;

        logger.info("Iniciando proceso con Replicate para nueva imagen");
        const output = await replicate.run(
            "black-forest-labs/flux-dev",
            {
                input: {
                    image: imageUrl,
                    prompt: `${actualPrompt}, masterpiece, best quality`,
                    prompt_strength: 0.8,
                    num_inference_steps: 28,
                    guidance: 3.5,
                    output_format: "jpg"
                }
            }
        );

        // Replicate v1+ SDK returns FileOutput streams instead of raw URL strings.
        const outputArr = output as any[];
        const outputUrls = Array.isArray(outputArr) 
            ? outputArr.map((item: any) => typeof item.url === 'function' ? item.url().toString() : String(item))
            : [String(output)];
        
        const rawOutputUrl = outputUrls[0];
        if (!rawOutputUrl) {
            throw new Error("No URL returned from Replicate");
        }

        // 3. Download the generated image from Replicate so it doesn't expire
        const imageRes = await fetch(rawOutputUrl);
        if (!imageRes.ok) throw new Error("Failed to fetch generated image from Replicate");
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 4. Upload it permanently to Firebase Storage
        const bucket = admin.storage().bucket();
        const filePath = `cached_ai_images/${cacheKey}.jpg`;
        const file = bucket.file(filePath);
        await file.save(buffer, { contentType: "image/jpeg" });

        // Retrieve public URL
        const bucketName = bucket.name || `${process.env.GCLOUD_PROJECT}.firebasestorage.app`;
        const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;

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