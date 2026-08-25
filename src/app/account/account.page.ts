import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonCard, IonText, IonMenuButton, IonButtons, IonAvatar, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, locationOutline, trashOutline, personOutline, logOutOutline, starOutline } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { UserProfile, Address } from '../models/profile.interface';
import { AddAddressModalComponent } from '../components/add-address-modal/add-address-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonCard, IonText, IonMenuButton, IonButtons, IonAvatar, IonSpinner]
})
export class AccountPage implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  loading = true;

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);
  
  private authSub?: Subscription;

  constructor() {
    addIcons({ addOutline, locationOutline, trashOutline, personOutline, logOutOutline, starOutline });
  }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe((user: any) => {
      if (user) {
        this.loadProfile();
      } else {
        this.router.navigate(['/landing']);
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  async loadProfile() {
    this.loading = true;
    try {
      this.profile = await this.userService.getUserProfile();
    } catch (e) {
      console.error('Error loading profile', e);
    } finally {
      this.loading = false;
    }
  }

  async openAddAddressModal() {
    const modal = await this.modalCtrl.create({
      component: AddAddressModalComponent
    });
    
    await modal.present();
    
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      await this.userService.addAddress(data as Address);
      await this.loadProfile(); // reload changes
    }
  }

  async removeAddress(addressId: string | undefined) {
    if (!addressId) return;
    await this.userService.removeAddress(addressId);
    await this.loadProfile(); // reload changes
  }

  async logout() {
    await this.authService.logout();
  }
}
