import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const processAiImage = onCall({
    timeoutSeconds: 120, // Damos más tiempo para que la IA responda
    memory: "256MiB"     // Memoria suficiente para el túnel de la API
}, async (request) => {
    // Importamos Replicate DENTRO para que el contenedor inicie más rápido
    const { default: Replicate } = await import("replicate");

    const replicate = new Replicate({
        auth: "",
    });

    const { imageUrl, promptStyle } = request.data;

    if (!imageUrl) {
        throw new HttpsError("invalid-argument", "Falta la URL de la imagen");
    }

    try {
        logger.info("Iniciando proceso con Replicate para:", imageUrl);

        const output = await replicate.run(
            "stability-ai/sdxl:363e72b0",
            {
                input: {
                    image: imageUrl,
                    prompt: `${promptStyle}, vibrant oil painting style, masterpiece`,
                    structure_conditioning_scale: 0.8,
                },
            }
        );

        return { success: true, output };
    } catch (error: any) {
        logger.error("Error en Replicate:", error);
        throw new HttpsError("internal", error.message || "Error en IA");
    }
});