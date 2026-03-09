import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from '@angular/fire/storage';
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
  uploadImage(file: File, userId: string): Observable<string> {
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}_${file.name}`;
    const filePath = `users/${userId}/uploads/${fileName}`;
    const storageRef = ref(this.storage, filePath);

    // Using 'from' to convert the Promise-based upload into an Observable
    return from(uploadBytesResumable(storageRef, file)).pipe(
      switchMap((snapshot: UploadTaskSnapshot) => from(getDownloadURL(snapshot.ref)))
    );
  }
}
