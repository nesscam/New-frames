import { Injectable } from '@angular/core';
import { Auth, authState, User, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private auth: Auth) {
    this.user$ = authState(this.auth);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider);
  }

  async logout() {
    return await signOut(this.auth);
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.user$.pipe(map(user => !!user));
  }
}
