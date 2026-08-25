import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonTabBar, IonTabButton, IonLabel, ModalController, IonHeader, IonMenuButton, IonButtons } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthModalComponent } from '../components/auth-modal/auth-modal.component';
import { addIcons } from 'ionicons';
import { imagesOutline, colorPaletteOutline, starOutline, personOutline, menuOutline, layersOutline, star } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  imports: [IonContent, IonButton, IonIcon, IonTabBar, IonTabButton, IonLabel, IonHeader, IonMenuButton, IonButtons, CommonModule, TranslateModule]
})
export class LandingPage implements OnInit, OnDestroy {
  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({ imagesOutline, colorPaletteOutline, starOutline, personOutline, menuOutline, layersOutline, star });
  }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe(user => {
      // Automatic Auth Guard Check
      if (user) {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  async openAuthModal() {
    const modal = await this.modalCtrl.create({
      component: AuthModalComponent,
    });
    await modal.present();
  }
}
