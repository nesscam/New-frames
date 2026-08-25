import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiPromptService {
  private processAiImageCallable: ReturnType<typeof httpsCallable>;

  constructor(private functions: Functions) {
    this.processAiImageCallable = httpsCallable(this.functions, 'processAiImage');
  }

  /**
   * Sends an image and a style prompt to the AI processing Cloud Function.
   *
   * @param imageUrlOrBase64 The source image to stylize.
   * @param stylePrompt The style description (e.g. 'Cyberpunk', 'Watercolor').
   * @returns An observable with the stylized image result.
   */
  processImage(imageUrlOrBase64: string, stylePrompt: string): Observable<any> {
    const payload = {
      imageUrl: imageUrlOrBase64,
      promptStyle: stylePrompt
    };

    return from(this.processAiImageCallable(payload));
  }
}
