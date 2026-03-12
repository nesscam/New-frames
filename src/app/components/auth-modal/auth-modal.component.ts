import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonFooter,
  IonButtons,
  IonIcon,
  ModalController,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonFooter,
    IonButtons,
    IonIcon,
    IonText
  ]
})
export class AuthModalComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);

  authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLogin = true;

  constructor() {
    addIcons({ logoGoogle, mailOutline, lockClosedOutline });
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      this.dismissModal();
    } catch (error) {
      console.error(error);
    }
  }

  async onSubmit() {
    if (this.authForm.valid) {
      const { email, password } = this.authForm.value;
      try {
        if (this.isLogin) {
          await this.authService.loginWithEmail(email, password);
        } else {
          await this.authService.signUpWithEmail(email, password);
        }
        this.dismissModal();
      } catch (error) {
        console.error(error);
      }
    }
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }
}
