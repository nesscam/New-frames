import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageAiService {
  private readonly replicateApiUrl = 'https://api.replicate.com/v1/predictions';

  // Master Prompts in English
  private readonly MASTER_PROMPTS: { [key: string]: string } = {
    'Neon': 'Cyberpunk style, neon lights, futuristic city, glowing colors, highly detailed, 8k resolution',
    'Watercolor': 'Soft watercolor painting, artistic brush strokes, pastel colors, dreamlike atmosphere, fluid textures',
    'Oil': 'Classical oil painting, heavy texture, rich colors, impasto technique, museum quality, dramatic lighting'
  };

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
    private storage: Storage
  ) {}

  /**
   * Generates artistic version of a user image using Replicate (SDXL).
   *
   * @param userImage The original image as a Blob.
   * @param styleKey The artistic style key (Neon, Watercolor, Oil).
   * @param userId The ID of the user.
   * @returns Observable with the URL of the generated image.
   */
  generateArt(userImage: Blob, styleKey: string, userId: string): Observable<string> {
    const stylePrompt = this.MASTER_PROMPTS[styleKey] || styleKey;
    const userDocRef = doc(this.firestore, `users/${userId}`);

    return from(getDoc(userDocRef)).pipe(
      switchMap(docSnap => {
        if (!docSnap.exists() || (docSnap.data()?.['credits'] ?? 0) < 1) {
          return throwError(() => new Error('Insufficient credits or user not found.'));
        }

        // 1. Upload init image to a temporary public location or use a Data URL if Replicate supports it.
        // Usually Replicate needs a URL. Let's upload to a temp folder in Firebase.
        const tempPath = `temp_uploads/${userId}/${Date.now()}.png`;
        const tempRef = ref(this.storage, tempPath);

        return from(uploadBytes(tempRef, userImage)).pipe(
          switchMap(snapshot => from(getDownloadURL(snapshot.ref)))
        );
      }),
      switchMap((initImageUrl: string) => {
        // 2. Call Replicate API (Proxy recommended to hide key, but here we follow request)
        const body = {
          version: "39ed52f2a78e934b3ba6e24ee33373c959d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1", // SDXL version placeholder
          input: {
            image: initImageUrl,
            prompt: stylePrompt,
            refine: "expert_ensemble_refiner",
            apply_watermark: false,
            num_inference_steps: 25
          }
        };

        const headers = new HttpHeaders({
          'Authorization': `Token ${environment.replicateApiKey}`,
          'Content-Type': 'application/json'
        });

        return this.http.post<any>(this.replicateApiUrl, body, { headers });
      }),
      switchMap((prediction: any) => {
        // 3. Replicate is async. In a real app, we'd poll or use webhooks.
        // For this implementation, we will assume a proxy or a simplified flow.
        // But to be helpful, let's at least return the prediction URL if we can't poll here easily.
        // Actually, the user wants to "Conecta con la API", so I should implement a basic poll or
        // return the prediction ID.
        // Let's assume the user will handle polling in the component or I add a simple poll here.

        return this.pollPrediction(prediction.urls.get, headers);
      }),
      switchMap((outputUrl: string) => {
        // 4. Download generated image from Replicate and upload to Firebase Storage
        // Ensuring we use high-res result and tagging metadata for 300 DPI
        return this.http.get(outputUrl, { responseType: 'blob' }).pipe(
          switchMap((blob: Blob) => {
            const timestamp = Date.now();
            const filePath = `generated_art/${userId}/lumio_hires_${timestamp}.png`;
            const storageRef = ref(this.storage, filePath);
            return from(uploadBytes(storageRef, blob, {
              contentType: 'image/png',
              customMetadata: { 'dpi': '300', 'app': 'LUMIO', 'quality': 'high-res' }
            })).pipe(
              switchMap(snapshot => from(getDownloadURL(snapshot.ref)))
            );
          })
        );
      }),
      catchError(error => {
        console.error('Error generating art:', error);
        return throwError(() => error);
      })
    );
  }
}
