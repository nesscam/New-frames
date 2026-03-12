import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  authState,
  User,
  signOut
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth | null = null;
  private router: Router = inject(Router);

  readonly user$: Observable<User | null>;

  constructor() {
    try {
      this.auth = inject(Auth);
      if (this.auth) {
        this.user$ = authState(this.auth);
      } else {
        this.user$ = of(null);
      }
    } catch (e) {
      console.warn("Firebase Auth not initialized", e);
      this.user$ = of(null);
    }
  }

  async loginWithGoogle() {
    if (!this.auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.auth, provider);
      if (result.user) {
        this.router.navigate(['/home']);
      }
      return result;
    } catch (error) {
      console.error('Error logging in with Google', error);
      throw error;
    }
  }

  async loginWithEmail(email: string, password: string) {
    if (!this.auth) return;
    try {
      const { signInWithEmailAndPassword } = await import('@angular/fire/auth');
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      if (result.user) {
        this.router.navigate(['/home']);
      }
      return result;
    } catch (error) {
      console.error('Error logging in with email', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string) {
    if (!this.auth) return;
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      if (result.user) {
        this.router.navigate(['/home']);
      }
      return result;
    } catch (error) {
      console.error('Error signing up with email', error);
      throw error;
    }
  }

  async logout() {
    if (!this.auth) return;
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']); // Assuming a login route or just home
    } catch (error) {
      console.error('Error logging out', error);
    }
  }
}
