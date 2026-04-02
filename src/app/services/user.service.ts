import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AuthService } from './auth.service';
import { UserProfile, Address } from '../models/profile.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore, { optional: true });
  private auth = inject(Auth, { optional: true });

  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.auth || !this.firestore) return null;
    const user = this.auth.currentUser;
    if (!user) return null;

    try {
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        // Create initial profile if it doesn't exist
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          addresses: []
        };
        await setDoc(userDocRef, initialProfile);
        return initialProfile;
      }
    } catch (e) {
      console.error('Error fetching user profile', e);
      return null;
    }
  }

  async addAddress(address: Address): Promise<void> {
    if (!this.auth || !this.firestore) return;
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const profile = await this.getUserProfile();
    const addresses = profile?.addresses || [];
    
    // Generate a simple ID
    const newAddress = { ...address, id: Date.now().toString() };
    
    // If it's the first address or marked as default, make sure others are not default
    if (newAddress.isDefault || addresses.length === 0) {
      newAddress.isDefault = true;
      addresses.forEach(a => a.isDefault = false);
    }

    const updatedAddresses = [...addresses, newAddress];
    
    try {
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      await updateDoc(userDocRef, {
        addresses: updatedAddresses
      });
    } catch (e) {
      console.error('Error saving address', e);
    }
  }

  async removeAddress(addressId: string): Promise<void> {
    if (!this.auth || !this.firestore) return;
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const profile = await this.getUserProfile();
    if (!profile) return;

    const filteredAddresses = (profile.addresses || []).filter(a => a.id !== addressId);
    
    try {
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      await updateDoc(userDocRef, {
        addresses: filteredAddresses
      });
    } catch (e) {
      console.error('Error removing address', e);
    }
  }
}
