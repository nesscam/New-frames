import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, UploadTaskSnapshot } from '@angular/fire/storage';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  constructor(private storage: Storage) { }

  /**
   * Uploads an image file to Firebase Storage.
   * Path: users/{userId}/uploads/{userId}_{timestamp}_{originalFilename}
   *
   * @param file The file object to upload.
   * @param userId The ID of the authenticated user.
   * @returns An Observable of the download URL.
   */
  async uploadImage(file: File, userId: string): Observable<string> {
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}_${file.name}`;
    const filePath = `users/${userId}/uploads/${fileName}`;
    const storageRef = ref(this.storage, filePath);

    const snapshot = await uploadBytes(storageRef, file);

    // 3. Obtenemos la URL pública de descarga
    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Using 'from' to convert the Promise-based upload into an Observable
    return from(uploadBytesResumable(storageRef, file)).pipe(
      switchMap((snapshot: UploadTaskSnapshot) => from(getDownloadURL(snapshot.ref)))
    );
  }
}
