import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import * as admin from "firebase-admin";
import { processAiImage, saveImagePermanently, upscaleImageForPrint } from "./index";

// R1-01: the three AI Cloud Functions must reject any invocation where
// request.auth?.uid is missing, and must let authenticated calls proceed
// to their normal argument validation / execution.

const AUTHENTICATED = {
    uid: "test-user-1",
    token: {} as any,
    rawToken: "fake-raw-token",
};

async function expectUnauthenticated(fn: { run: (req: any) => Promise<any> }, data: Record<string, unknown>) {
    await assert.rejects(
        () => fn.run({ data, auth: undefined } as any),
        (err: any) => {
            assert.equal(err.code, "unauthenticated");
            return true;
        }
    );
}

describe("R1-01 mandatory authentication on AI Cloud Functions", () => {
    describe("processAiImage", () => {
        test("rejects unauthenticated calls with 'unauthenticated'", async () => {
            await expectUnauthenticated(processAiImage, { imageUrl: "https://example.com/photo.jpg" });
        });

        test("authenticated calls pass the auth guard and reach normal validation", async () => {
            // No imageUrl provided: if the auth guard were bypassed correctly,
            // execution proceeds to the next check and fails on invalid-argument,
            // not unauthenticated.
            await assert.rejects(
                () => processAiImage.run({ data: {}, auth: AUTHENTICATED } as any),
                (err: any) => {
                    assert.equal(err.code, "invalid-argument");
                    return true;
                }
            );
        });

        test("authenticated calls with a full payload reach normal execution (cache hit path)", async () => {
            const cachedUrl = "https://storage.example.com/cached_ai_images/abc.jpg";
            Object.defineProperty(admin, "firestore", {
                configurable: true,
                value: () => ({
                    collection: () => ({
                        doc: () => ({
                            get: async () => ({
                                exists: true,
                                data: () => ({ permanentUrl: cachedUrl }),
                            }),
                        }),
                    }),
                }),
            });

            try {
                const result: any = await processAiImage.run({
                    data: { imageUrl: "https://example.com/photo.jpg", promptStyle: "Luxury_Minimal", intensity: 0.5 },
                    auth: AUTHENTICATED,
                } as any);
                assert.equal(result.success, true);
                assert.deepEqual(result.output, [cachedUrl]);
            } finally {
                // Removes the own-property override so the module's original
                // prototype getter for `firestore` is used again.
                delete (admin as any).firestore;
            }
        });
    });

    describe("saveImagePermanently", () => {
        test("rejects unauthenticated calls with 'unauthenticated'", async () => {
            await expectUnauthenticated(saveImagePermanently, {
                rawOutputUrl: "https://example.com/out.jpg",
                cacheKey: "abc123",
            });
        });

        test("authenticated calls pass the auth guard and reach normal validation", async () => {
            await assert.rejects(
                () => saveImagePermanently.run({ data: {}, auth: AUTHENTICATED } as any),
                (err: any) => {
                    assert.equal(err.code, "invalid-argument");
                    return true;
                }
            );
        });
    });

    describe("upscaleImageForPrint", () => {
        test("rejects unauthenticated calls with 'unauthenticated'", async () => {
            await expectUnauthenticated(upscaleImageForPrint, { imageUrl: "https://example.com/photo.jpg" });
        });

        test("authenticated calls pass the auth guard and reach normal validation", async () => {
            await assert.rejects(
                () => upscaleImageForPrint.run({ data: {}, auth: AUTHENTICATED } as any),
                (err: any) => {
                    assert.equal(err.code, "invalid-argument");
                    return true;
                }
            );
        });
    });
});
