import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Firestore, doc, getDoc, collection, addDoc } from '@angular/fire/firestore';
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
    'Oil': 'Classical oil painting, heavy texture, rich colors, impasto technique, museum quality, dramatic lighting',
    'Sketch': 'Hand-drawn pencil sketch, charcoal lines, artistic shading, graphite texture, white paper background',
    'Comic': 'Pop art comic book style, bold outlines, Ben-Day dots, vibrant colors, superhero aesthetic'
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

    const headers = new HttpHeaders({
      'Authorization': `Token ${environment.replicateApiKey}`,
      'Content-Type': 'application/json'
    });

    return from(getDoc(userDocRef)).pipe(
      switchMap(docSnap => {
        if (!docSnap.exists() || (docSnap.data()?.['credits'] ?? 0) < 1) {
          return throwError(() => new Error('Insufficient credits or user not found.'));
        }

        const tempPath = `temp_uploads/${userId}/${Date.now()}.png`;
        const tempRef = ref(this.storage, tempPath);

        return from(uploadBytes(tempRef, userImage)).pipe(
          switchMap(snapshot => from(getDownloadURL(snapshot.ref)))
        );
      }),
      switchMap((initImageUrl: string) => {
        const body = {
          version: "39ed52f2a78e934b3ba6e24ee33373c959d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1",
          input: {
            image: initImageUrl,
            prompt: stylePrompt,
            refine: "expert_ensemble_refiner",
            apply_watermark: false,
            num_inference_steps: 25
          }
        };

        return this.http.post<any>(this.replicateApiUrl, body, { headers });
      }),
      switchMap((prediction: any) => {
        return this.pollPrediction(prediction.urls.get, headers);
      }),
      switchMap((outputUrl: string) => {
        // 4. Download generated image from Replicate and upload to Firebase Storage
        // Ensuring we use high-res result and tagging metadata for 300 DPI
        return this.http.get(outputUrl, { responseType: 'blob' }).pipe(
          switchMap((blob: Blob) => {
            const timestamp = Date.now();
            const filePath = `generated_art/${userId}/framia_hires_${timestamp}.png`;
            const storageRef = ref(this.storage, filePath);
            return from(uploadBytes(storageRef, blob, {
              contentType: 'image/png',
              customMetadata: { 'dpi': '300', 'app': 'FRAMIA', 'quality': 'high-res' }
            })).pipe(
              switchMap(snapshot => from(getDownloadURL(snapshot.ref))),
              switchMap(downloadUrl => {
                // Save to Firestore /my_art collection
                const artItem = {
                  userId,
                  imageUrl: downloadUrl,
                  style: styleKey,
                  isFavorite: false,
                  createdAt: new Date(),
                  highResUrl: outputUrl // Store original Replicate URL or high-res path
                };
                const artRef = collection(this.firestore, 'my_art');
                return from(addDoc(artRef, artItem)).pipe(map(() => downloadUrl));
              })
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

  private pollPrediction(url: string, headers: HttpHeaders): Observable<string> {
    // Simple polling implementation
    return new Observable<string>(observer => {
      const interval = setInterval(() => {
        this.http.get<any>(url, { headers }).subscribe({
          next: (prediction) => {
            if (prediction.status === 'succeeded') {
              clearInterval(interval);
              observer.next(prediction.output[0]);
              observer.complete();
            } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
              clearInterval(interval);
              observer.error(new Error(`Prediction ${prediction.status}`));
            }
          },
          error: (err) => {
            clearInterval(interval);
            observer.error(err);
          }
        });
      }, 3000); // Poll every 3 seconds
    });
  }
}
