import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { subscribe, config } from "@fal-ai/serverless-client";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Rejects any callable invocation that is not authenticated.
 * Must be called as the first statement in every onCall handler that
 * touches paid/limited resources (AI generation, storage writes).
 */
function requireAuth(request: { auth?: { uid?: string } | null }): void {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Esta operación requiere autenticación.");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE CONFIG — per-style strength ranges & guidance
// Key insight: FLUX destroys facial identity above ~0.55 strength.
// Each style gets its own calibrated range.
// ═══════════════════════════════════════════════════════════════════════════════

interface StyleConfig {
    /** The Fal.ai model endpoint to use. Defaults to 'fal-ai/flux/dev/image-to-image' */
    model?: string;
    /** Optional target template URL for face swap */
    templateUrl?: string;
    /** Whether to run a style-transfer image-to-image pass after face swapping to blend the face texture into the template style */
    runStylePassAfterSwap?: boolean;
    /** Short, visual FLUX-optimized descriptor */
    descriptor: string;
    /** Minimum strength (when intensity = 0) */
    strengthMin: number;
    /** Maximum strength (when intensity = 1) */
    strengthMax: number;
    /** Guidance scale — controls prompt adherence */
    guidance: number;
    /** Whether to preserve original facial features and identity */
    preserveIdentity: boolean;
}

const STYLE_CONFIG: Record<string, StyleConfig> = {
    Cinematic_Royal: {
        templateUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000",
        descriptor: "epic royal portrait, cinematic lighting, medieval elegant attire, rich deep colors, dramatic shadows, museum masterpiece, 8k resolution, volumetric light",
        strengthMin: 0.65,
        strengthMax: 0.85,
        guidance: 8,
        preserveIdentity: true,
    },
    Luxury_Minimal: {
        descriptor: "luxury minimal portrait, high fashion editorial, stark white and beige tones, elegant simplicity, soft studio lighting, premium aesthetic, sleek and modern",
        strengthMin: 0.35,
        strengthMax: 0.55,
        guidance: 8,
        preserveIdentity: true,
    },
    Fantasy_Epic: {
        descriptor: "epic fantasy portrait, magical glowing atmosphere, ethereal background, elven or sci-fi aesthetic, highly detailed masterpiece, cinematic movie poster",
        strengthMin: 0.65,
        strengthMax: 0.85,
        guidance: 8,
        preserveIdentity: false,
    },
    Renaissance_Masterpiece: {
        templateUrl: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=1000",
        descriptor: "epic renaissance oil portrait, dramatic golden lighting, museum masterpiece, ultra detailed brush strokes, cinematic shadows, royal atmosphere, luxury wall art, gallery quality",
        strengthMin: 0.45,
        strengthMax: 0.75,
        guidance: 9,
        preserveIdentity: true,
    },
    Dreamy_Watercolor_Gallery: {
        descriptor: "artistic watercolor portrait painting, soft pastel color washes, light paint splatters and bleeds, wet-on-wet watercolor technique, on premium clean white textured watercolor paper, minimalist composition, elegant and romantic, gallery quality",
        strengthMin: 0.55,
        strengthMax: 0.65,
        guidance: 7,
        preserveIdentity: true,
    },
    Minimalist_Line_Art: {
        templateUrl: "https://images.unsplash.com/photo-1594744803329-e58b31de215f?q=80&w=1000",
        runStylePassAfterSwap: true,
        descriptor: "minimalist continuous line art portrait, single line weight vector outline, sleek black ink lines on solid off-white background, elegant cardstock paper texture, artistic faceless silhouette style, clean aesthetic, high-end gallery print, absolute simplicity, no colors, no shadows",
        strengthMin: 0.32,
        strengthMax: 0.45,
        guidance: 9,
        preserveIdentity: false,
    },
    Fine_Pencil_Sketch: {
        templateUrl: "https://firebasestorage.googleapis.com/v0/b/new-frames-703a6.firebasestorage.app/o/templates%2Fpencil.png?alt=media&token=bb0c289a-3d2b-462e-9d51-dfa0b5ac589f",
        runStylePassAfterSwap: true,
        descriptor: "fine pencil sketch portrait, hand-drawn graphite art, detailed cross-hatching shading, charcoal outlines, clean textured sketch paper background, monochrome art, elegant studio drawing, masterpiece, no color",
        strengthMin: 0.28,
        strengthMax: 0.40,
        guidance: 8,
        preserveIdentity: false,
    },
    Cinematic_Graphic_Novel: {
        descriptor: "cinematic graphic novel art, striking ink shading, dramatic composition, rich vibrant colors, superhero comic poster, award-winning illustration",
        strengthMin: 0.60,
        strengthMax: 0.80,
        guidance: 8,
        preserveIdentity: false,
    },
    Cyberpunk_Movie_Poster: {
        descriptor: "cyberpunk movie poster, neon glowing aesthetic, futuristic city reflections, dramatic rim lighting, sci-fi masterpiece, cinematic quality",
        strengthMin: 0.65,
        strengthMax: 0.85,
        guidance: 8,
        preserveIdentity: false,
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER — short, visual, FLUX-optimized
// FLUX responds much better to direct visual instructions than literary prompts.
// ═══════════════════════════════════════════════════════════════════════════════

function buildPrompt(style: string): string {
    const cfg = STYLE_CONFIG[style];
    if (!cfg) return style; // fallback: use raw style string

    const basePrompt = [
        cfg.descriptor,
        "centered composition",
        "wall art composition",
        "premium portrait framing",
        "high detail",
        "cinematic lighting"
    ];

    if (cfg.preserveIdentity) {
        basePrompt.push(
            "preserve exact facial identity",
            "recognizable face",
            "same person"
        );
    }

    return basePrompt.join(", ");
}

/**
 * Simple negative prompt — less aggressive to avoid confusing FLUX.
 * Overly specific negatives like "different hairstyle" can cause artefacts.
 */
function getNegativePrompt(): string {
    return [
        "blurry",
        "low quality",
        "deformed face",
        "extra limbs",
        "duplicate",
        "bad anatomy",
        "cropped",
        "text",
        "watermark",
    ].join(", ");
}

/**
 * Calculates the per-style strength from user intensity (0–1).
 * Maps intensity within the style's safe strength range.
 */
function getStrength(style: string, intensity: number): number {
    const cfg = STYLE_CONFIG[style];
    if (!cfg) return 0.30; // safe fallback
    return cfg.strengthMin + intensity * (cfg.strengthMax - cfg.strengthMin);
}

/**
 * Returns the per-style guidance scale.
 */
function getGuidance(style: string): number {
    return STYLE_CONFIG[style]?.guidance ?? 7;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — FLUX image-to-image stylization + CodeFormer face restore
// Pipeline: Original → FLUX (low strength) → CodeFormer → return
// ═══════════════════════════════════════════════════════════════════════════════

export const processAiImage = onCall({
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: true,
    invoker: "public",
    secrets: ["FAL_KEY"]
}, async (request) => {
    requireAuth(request);

    const { imageUrl, promptStyle, intensity } = request.data;
    if (!imageUrl) {
        throw new HttpsError("invalid-argument", "Falta la URL de la imagen");
    }

    // 1. Cache key — includes style, intensity, and pipeline version
    const CACHE_VERSION = "v18_identity_preserving";
    const safeIntensity: number = typeof intensity === "number"
        ? Math.max(0, Math.min(1, intensity))
        : 0.5;
    const intensityKey = safeIntensity.toFixed(1);
    const cacheKey = crypto.createHash("md5")
        .update(imageUrl + promptStyle + intensityKey + CACHE_VERSION)
        .digest("hex");
    const db = admin.firestore();
    const cacheRef = db.collection("ai_images_cache").doc(cacheKey);

    try {
        // 2. Check cache
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists && cacheSnap.data()?.permanentUrl) {
            logger.info("Serving from cache for key:", cacheKey);
            return { success: true, output: [cacheSnap.data()?.permanentUrl], rawUrl: false };
        }

        // 3. Configure fal.ai
        config({ credentials: process.env.FAL_KEY || "" });

        // 4. Build prompt & calculate per-style parameters
        const finalPrompt    = buildPrompt(promptStyle);
        const negativePrompt = getNegativePrompt();

        const styleCfg = STYLE_CONFIG[promptStyle];
        const targetTemplateUrl = styleCfg?.templateUrl;
        const preserveIdentity = styleCfg?.preserveIdentity ?? true;

        let stylizedUrl: string;

        if (targetTemplateUrl) {
            logger.info(`[FACE-SWAP] style=${promptStyle}, targetTemplateUrl=${targetTemplateUrl}, sourceImageUrl=${imageUrl}`);
            // Quick check: verify template URL is reachable before calling Fal.ai
            try {
                const headCheck = await fetch(targetTemplateUrl, { method: "HEAD" });
                logger.info(`[FACE-SWAP] Template URL HEAD check: status=${headCheck.status}, content-type=${headCheck.headers.get("content-type")}`);
                if (!headCheck.ok) {
                    logger.error(`[FACE-SWAP] Template URL returned ${headCheck.status} — likely blocked by Unsplash. Upload image to Firebase Storage instead.`);
                }
            } catch (headErr: any) {
                logger.warn(`[FACE-SWAP] Could not HEAD-check template URL: ${headErr.message}`);
            }
            let faceSwapResult: any;
            try {
                faceSwapResult = await subscribe("fal-ai/face-swap", {
                    input: {
                        base_image_url: targetTemplateUrl,
                        swap_image_url: imageUrl,
                    }
                });
                logger.info("[FACE-SWAP] Raw result:", JSON.stringify(faceSwapResult));
            } catch (swapErr: any) {
                logger.error("[FACE-SWAP] ERROR from fal-ai/face-swap:", JSON.stringify(swapErr));
                logger.error("[FACE-SWAP] Error body:", swapErr?.body ?? swapErr?.response ?? swapErr?.message);
                throw new Error(`fal-ai/face-swap failed: ${JSON.stringify(swapErr?.body ?? swapErr?.message ?? swapErr)}`);
            }

            const swapUrl = faceSwapResult?.image?.url || faceSwapResult?.output?.url;
            if (!swapUrl) {
                throw new Error("No URL returned from fal-ai/face-swap");
            }
            logger.info("[FACE-SWAP] Face swap complete:", swapUrl);
            stylizedUrl = swapUrl;

            // ── Step A2: Optional style pass after swap to blend the face into the template style ──
            if (styleCfg?.runStylePassAfterSwap) {
                const falStrength    = getStrength(promptStyle, safeIntensity);
                const guidanceScale  = getGuidance(promptStyle);
                const modelEndpoint  = styleCfg?.model || "fal-ai/flux/dev/image-to-image";
                const isFlux = modelEndpoint.includes("flux");

                logger.info(`[STYLE PASS] Blending swap image into style: ${promptStyle}, model=${modelEndpoint}, strength=${falStrength.toFixed(3)}`);
                const inputPayload: Record<string, any> = {
                    prompt: finalPrompt,
                    image_url: swapUrl,
                    strength: falStrength,
                    num_inference_steps: 28,
                    guidance_scale: guidanceScale,
                    enable_safety_checker: false,
                };

                if (!isFlux) {
                    inputPayload["negative_prompt"] = negativePrompt;
                }

                const styleResult = await subscribe(modelEndpoint, {
                    input: inputPayload
                }) as any;

                const blendedUrl = styleResult?.images?.[0]?.url;
                if (blendedUrl) {
                    stylizedUrl = blendedUrl;
                    logger.info("[STYLE PASS] Blending complete:", blendedUrl);
                } else {
                    logger.warn("[STYLE PASS] Blending failed, using swap image as-is");
                }
            }
        } else {
            const falStrength    = getStrength(promptStyle, safeIntensity);
            const guidanceScale  = getGuidance(promptStyle);
            const modelEndpoint  = styleCfg?.model || "fal-ai/flux/dev/image-to-image";
            const isFlux = modelEndpoint.includes("flux");

            logger.info(`[FLUX] style=${promptStyle}, model=${modelEndpoint}, intensity=${safeIntensity}, strength=${falStrength.toFixed(3)}, guidance=${guidanceScale}`);
            logger.info(`[FLUX] prompt=${finalPrompt}`);

            // ── Step A: Image-to-Image / Edit stylization ──
            const inputPayload: Record<string, any> = {
                prompt: finalPrompt,
                image_url: imageUrl,
                strength: falStrength,
                num_inference_steps: 28,
                guidance_scale: guidanceScale,
                enable_safety_checker: false,
            };

            if (!isFlux) {
                inputPayload["negative_prompt"] = negativePrompt;
            }

            const fluxResult = await subscribe(modelEndpoint, {
                input: inputPayload
            }) as any;

            stylizedUrl = fluxResult?.images?.[0]?.url;
            if (!stylizedUrl) {
                throw new Error(`No URL returned from ${modelEndpoint} stylization`);
            }
            logger.info("[FLUX] Stylization complete:", stylizedUrl);
        }

        // ── Step B: CodeFormer face restoration (optional) ──
        // Repairs any facial degradation from stylization if configured.
        let finalUrl = stylizedUrl;
        if (preserveIdentity) {
            try {
                logger.info("[CodeFormer] Starting face restoration...");
                const faceResult = await subscribe("fal-ai/codeformer", {
                    input: {
                        image_url: stylizedUrl,
                        fidelity: 0.7,
                        only_center_face: false,
                    }
                }) as any;

                const restoredUrl = faceResult?.image?.url || faceResult?.output?.url;
                if (restoredUrl) {
                    finalUrl = restoredUrl;
                    logger.info("[CodeFormer] Face restoration complete:", restoredUrl);
                } else {
                    logger.warn("[CodeFormer] No output URL, using stylized image as-is");
                }
            } catch (faceErr: any) {
                // Face restoration is enhancement, not critical — don't fail the whole pipeline
                logger.warn("[CodeFormer] Face restore failed, continuing with stylized image:", faceErr.message);
            }
        } else {
            logger.info("[CodeFormer] Skipping face restoration as preserveIdentity is false for style:", promptStyle);
        }

        // 5. Return immediately for speed; save permanently in background
        return {
            success: true,
            output: [finalUrl],
            rawUrl: true,
            cacheKey,
            promptStyle
        };
    } catch (error: any) {
        logger.error("Error in AI pipeline:", error);
        throw new HttpsError("internal", error.message || "Error en IA");
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Save generated image permanently to Firebase Storage
// ═══════════════════════════════════════════════════════════════════════════════

export const saveImagePermanently = onCall({
    timeoutSeconds: 300,
    memory: "512MiB"
}, async (request) => {
    requireAuth(request);

    const { rawOutputUrl, cacheKey, promptStyle } = request.data;
    if (!rawOutputUrl || !cacheKey) throw new HttpsError("invalid-argument", "Faltan datos");

    try {
        const imageRes = await fetch(rawOutputUrl);
        if (!imageRes.ok) throw new Error("Failed to fetch generated image");
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { getDownloadURL } = require("firebase-admin/storage");
        const bucketName = process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : 'new-frames-703a6.firebasestorage.app';
        const bucket = admin.storage().bucket(bucketName);
        const file = bucket.file(`cached_ai_images/${cacheKey}.jpg`);
        await file.save(buffer, { contentType: "image/jpeg" });
        const permanentUrl = await getDownloadURL(file);

        const db = admin.firestore();
        await db.collection("ai_images_cache").doc(cacheKey).set({
            originalHash: cacheKey,
            style: promptStyle,
            permanentUrl: permanentUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, permanentUrl };
    } catch (e: any) {
        logger.error("Error guardando imagen en storage", e);
        throw new HttpsError("internal", e.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Professional upscale pipeline for print
// Pipeline: CodeFormer face restore → ESRGAN 4x
// Supports optional second pass for very large formats (24x36, 30x40).
// ═══════════════════════════════════════════════════════════════════════════════

export const upscaleImageForPrint = onCall({
    timeoutSeconds: 300,
    memory: "1GiB",
    secrets: ["FAL_KEY"]
}, async (request) => {
    requireAuth(request);

    const { imageUrl, doublePasses } = request.data;
    if (!imageUrl) throw new HttpsError("invalid-argument", "Falta imageUrl");

    try {
        config({ credentials: process.env.FAL_KEY || "" });

        // ── Pass 1: Face restoration before upscale ──
        let inputForUpscale = imageUrl;
        try {
            logger.info("[Upscale] Step 1: CodeFormer face restoration...");
            const faceResult = await subscribe("fal-ai/codeformer", {
                input: {
                    image_url: imageUrl,
                    fidelity: 0.7,
                    only_center_face: false,
                }
            }) as any;

            const restoredUrl = faceResult?.image?.url || faceResult?.output?.url;
            if (restoredUrl) {
                inputForUpscale = restoredUrl;
                logger.info("[Upscale] Face restoration complete");
            }
        } catch (faceErr: any) {
            logger.warn("[Upscale] Face restore failed, continuing:", faceErr.message);
        }

        // ── Pass 2: ESRGAN 4x upscale ──
        logger.info("[Upscale] Step 2: ESRGAN 4x...");
        const result = await subscribe("fal-ai/esrgan", {
            input: {
                image_url: inputForUpscale,
                scale: 4
            }
        }) as any;

        let upscaledUrl = result?.image?.url || result?.images?.[0]?.url;
        if (!upscaledUrl) throw new Error("No URL returned from ESRGAN");
        logger.info("[Upscale] First 4x upscale complete");

        // ── Pass 3 (optional): Second 4x for very large prints ──
        // Use when target is 24x36+ at 150+ DPI (needs ~5400x3600+)
        if (doublePasses) {
            logger.info("[Upscale] Step 3: Second ESRGAN pass for large format print...");
            const result2 = await subscribe("fal-ai/esrgan", {
                input: {
                    image_url: upscaledUrl,
                    scale: 4
                }
            }) as any;

            const upscaledUrl2 = result2?.image?.url || result2?.images?.[0]?.url;
            if (upscaledUrl2) {
                upscaledUrl = upscaledUrl2;
                logger.info("[Upscale] Second 4x upscale complete");
            }
        }

        return { success: true, upscaledUrl };
    } catch (e: any) {
        logger.error("Error en upscaling pipeline", e);
        throw new HttpsError("internal", e.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY — CORS configuration
// ═══════════════════════════════════════════════════════════════════════════════

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