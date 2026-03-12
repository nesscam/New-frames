import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiPromptService {

  constructor(private http: HttpClient) { }

  /**
   * Sends an image and a style prompt to the AI processing Cloud Function.
   *
   * @param imageUrlOrBase64 The source image to stylize.
   * @param stylePrompt The style description (e.g. 'Cyberpunk', 'Watercolor').
   * @returns An observable with the stylized image result.
   */
  processImage(imageUrlOrBase64: string, stylePrompt: string): Observable<any> {
    const payload = {
      image: imageUrlOrBase64,
      prompt: stylePrompt
    };

    return this.http.post<any>(environment.api.processAiImage, payload);
  }
}
