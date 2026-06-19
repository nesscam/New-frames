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


  private processAiImageCallable: ReturnType<typeof httpsCallable>;

  // ── Upload cache: avoid re-uploading the same image for different styles ──
  private cachedBlobFingerprint: string | null = null;
  private cachedUploadUrl: string | null = null;

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
    private storage: Storage,
    private functions: Functions
  ) {
    this.processAiImageCallable = httpsCallable(this.functions, 'processAiImage', { timeout: 300000 });
  }

  /** Clears the cached upload URL (call when the user selects a new photo). */
  clearUploadCache(): void {
    this.cachedBlobFingerprint = null;
    this.cachedUploadUrl = null;
  }

  /** Simple fingerprint: blob size + type. Same original → same fingerprint. */
  private getBlobFingerprint(blob: Blob): string {
    return `${blob.size}_${blob.type}`;
  }

  /**
   * Generates artistic version of a user image using Fal.ai.
   *
   * @param userImage The original image as a Blob.
   * @param styleKey The artistic style key.
   * @param userId The ID of the user.
   * @returns Observable with the URL of the generated image.
   */
  generateArt(userImage: Blob, styleKey: string, userId: string): Observable<string> {
    const stylePrompt = styleKey;
    const userDocRef = doc(this.firestore, `users/${userId}`);
    const fingerprint = this.getBlobFingerprint(userImage);

    return from(getDoc(userDocRef)).pipe(
      switchMap(docSnap => {
        const userData = docSnap.exists() ? docSnap.data() : null;
        const credits = userData && userData['credits'] !== undefined ? userData['credits'] : 10;

        if (credits < 1) {
          return throwError(() => new Error('Insufficient credits.'));
        }

        // ── Reuse cached URL if the blob hasn't changed ──
        if (this.cachedBlobFingerprint === fingerprint && this.cachedUploadUrl) {
          console.log('[ImageAiService] Reusing cached upload URL — skipping re-upload');
          return from([this.cachedUploadUrl]);
        }

        // ── First time or new image: upload to temp storage ──
        const tempPath = `temp_uploads/${userId}/${Date.now()}.jpg`;
        const tempRef = ref(this.storage, tempPath);

        return from(uploadBytes(tempRef, userImage)).pipe(
          switchMap(snapshot => from(getDownloadURL(snapshot.ref))),
          map((url: string) => {
            // Cache for subsequent style changes
            this.cachedBlobFingerprint = fingerprint;
            this.cachedUploadUrl = url;
            return url;
          })
        );
      }),
      switchMap((initImageUrl: string) => {
        return from(this.processAiImageCallable({ imageUrl: initImageUrl, promptStyle: stylePrompt }));
      }),
      switchMap((response: any) => {
        const outputUrl = response.data.output[0];
        const isRaw = response.data.rawUrl;
        
        if (isRaw) {
          // 3. Guardado en segundo plano
          const saveImageCallable = httpsCallable(this.functions, 'saveImagePermanently');
          saveImageCallable({
            rawOutputUrl: outputUrl,
            cacheKey: response.data.cacheKey,
            promptStyle: response.data.promptStyle
          }).then((res: any) => {
            const permanentUrl = res.data.permanentUrl;
            const artItem = {
              userId,
              imageUrl: permanentUrl,
              style: styleKey,
              isFavorite: false,
              createdAt: new Date(),
              highResUrl: permanentUrl
            };
            const artRef = collection(this.firestore, 'my_art');
            addDoc(artRef, artItem);
          }).catch(err => console.error("Error saving permanently:", err));

          // Retornar INMEDIATAMENTE la URL de Fal.ai para mostrar en pantalla
          return from([outputUrl]);
        } else {
           // Si viene del caché, ya es permanente
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
        }
      }),
      catchError(error => {
        console.error('Error generating art:', error);
        return throwError(() => error);
      })
    );
  }


}
