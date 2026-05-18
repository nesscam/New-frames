const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const bucket = admin.storage().bucket("new-frames-703a6.firebasestorage.app");

async function configureCors() {
  await bucket.setCorsConfiguration([
    {
      origin: ["*"],
      method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
      maxAgeSeconds: 3600
    }
  ]);
  console.log("CORS configuration successfully set for the storage bucket!");
}

configureCors().catch(console.error);
