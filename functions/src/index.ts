import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Cloud Function to process an AI image.
 * Placeholder for actual AI API call.
 */
export const processAiImage = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { imageUrl, prompt } = request.data;

  if (!imageUrl || !prompt) {
    throw new HttpsError("invalid-argument", "The function must be called with imageUrl and prompt.");
  }

  console.log(`Processing image: ${imageUrl} with prompt: ${prompt}`);

  // Placeholder for AI API logic
  return {
    success: true,
    processedImageUrl: imageUrl, // For now, return the same URL
    message: "Image processed successfully (placeholder)"
  };
});

/**
 * Trigger to initialize user document in Firestore when a new user is created.
 * We use beforeUserCreated (Identity Platform) or we could use functions.auth.user().onCreate.
 * For v2, identity triggers are common, but traditional auth triggers are still in v1.
 * Let's use the v2 identity trigger if available, or a standard v1 auth trigger.
 */
export const onUserCreate = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  const db = admin.firestore();
  const userRef = db.collection("users").doc(user.uid);

  await userRef.set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    credits: 10, // Initial gift
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`Initialized Firestore document for user: ${user.uid}`);
});

/**
 * Trigger to validate user credits on update.
 */
export const onUserUpdate = onDocumentUpdated("users/{userId}", (event) => {
  const newValue = event.data?.after.data();
  const previousValue = event.data?.before.data();

  if (!newValue || !previousValue) {
    return;
  }

  // If credits changed, validate they are not negative
  if (newValue.credits !== previousValue.credits) {
    if (newValue.credits < 0) {
      console.error(`Invalid credits value for user ${event.params.userId}: ${newValue.credits}`);
      // In a real scenario, you might want to revert the change or handle it accordingly.
      // Firestore triggers cannot "block" the write, but we can log the error or take corrective action.
      throw new Error("Credits cannot be negative.");
    }
  }
});
