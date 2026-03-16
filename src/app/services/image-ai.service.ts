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
  private readonly stabilityApiUrl = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image';

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
    private storage: Storage
  ) {}

  /**
   * Generates artistic version of a user image using Stability AI SDXL.
   *
   * @param userImage The original image as a Blob.
   * @param stylePrompt The artistic style to apply.
   * @param userId The ID of the user.
   * @returns Observable with the URL of the generated image.
   */
  generateArt(userImage: Blob, stylePrompt: string, userId: string): Observable<string> {
    // 1. Check user credits in Firestore
    const userDocRef = doc(this.firestore, `users/${userId}`);

    return from(getDoc(userDocRef)).pipe(
      switchMap(docSnap => {
        if (!docSnap.exists() || (docSnap.data()?.['credits'] ?? 0) < 1) {
          return throwError(() => new Error('Insufficient credits or user not found.'));
        }

        // 2. Prepare API Request
        const formData = new FormData();
        formData.append('init_image', userImage);
        formData.append('image_strength', '0.35');
        formData.append('text_prompts[0][text]', stylePrompt);
        formData.append('text_prompts[0][weight]', '1');

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${environment.stabilityApiKey}`,
          'Accept': 'image/png'
        });

        // 3. Call Stability AI API
        return this.http.post(this.stabilityApiUrl, formData, {
          headers,
          responseType: 'blob'
        });
      }),
      switchMap((responseBlob: Blob) => {
        // 4. Upload to Firebase Storage
        const timestamp = Date.now();
        const filePath = `generated_art/${userId}/${timestamp}.png`;
        const storageRef = ref(this.storage, filePath);

        return from(uploadBytes(storageRef, responseBlob)).pipe(
          switchMap(snapshot => from(getDownloadURL(snapshot.ref)))
        );
      }),
      catchError(error => {
        console.error('Error generating art:', error);
        return throwError(() => error);
      })
    );
  }
}
