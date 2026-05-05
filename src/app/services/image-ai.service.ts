import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, doc, getDoc, collection, addDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImageAiService {
  // Master Prompts in English
  private readonly MASTER_PROMPTS: { [key: string]: string } = {
    'Neon': 'Cyberpunk style, neon lights, futuristic city, glowing colors, highly detailed, 8k resolution',
    'Watercolor': 'Soft watercolor painting, artistic brush strokes, pastel colors, dreamlike atmosphere, fluid textures',
    'Oil': 'Classical oil painting, heavy texture, rich colors, impasto technique, museum quality, dramatic lighting',
    'Sketch': 'Hand-drawn pencil sketch, charcoal lines, artistic shading, graphite texture, white paper background',
    'Comic': 'Pop art comic book style, bold outlines, Ben-Day dots, vibrant colors, superhero aesthetic'
  };

  private processAiImageCallable: ReturnType<typeof httpsCallable>;

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
    private storage: Storage,
    private functions: Functions
  ) {
    this.processAiImageCallable = httpsCallable(this.functions, 'processAiImage');
  }

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
        const userData = docSnap.exists() ? docSnap.data() : null;
        const credits = userData && userData['credits'] !== undefined ? userData['credits'] : 10; // Default to 10 credits for testing

        if (credits < 1) {
          return throwError(() => new Error('Insufficient credits.'));
        }

        const tempPath = `temp_uploads/${userId}/${Date.now()}.png`;
        const tempRef = ref(this.storage, tempPath);

        return from(uploadBytes(tempRef, userImage)).pipe(
          switchMap(snapshot => from(getDownloadURL(snapshot.ref)))
        );
      }),
      switchMap((initImageUrl: string) => {
        return from(this.processAiImageCallable({ imageUrl: initImageUrl, promptStyle: stylePrompt }));
      }),
      switchMap((response: any) => {
        const outputUrl = response.data.output[0];
        // The Cloud Function already uploaded the image to Firebase Storage.
        // We can just save the URL directly to Firestore instead of re-downloading/re-uploading.
        const artItem = {
          userId,
          imageUrl: outputUrl,
          style: styleKey,
          isFavorite: false,
          createdAt: new Date(),
          highResUrl: outputUrl
        };
        const artRef = collection(this.firestore, 'my_art');
        return from(addDoc(artRef, artItem)).pipe(map(() => outputUrl));
      }),
      catchError(error => {
        console.error('Error generating art:', error);
        return throwError(() => error);
      })
    );
  }


}
