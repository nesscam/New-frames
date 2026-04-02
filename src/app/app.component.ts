import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel, ModalController, IonMenuToggle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, colorPaletteOutline, cubeOutline, personOutline, logOutOutline, logInOutline } from 'ionicons/icons';
import { AuthService } from './services/auth.service';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, RouterModule, CommonModule, TranslateModule],
})
export class AppComponent {
  public authService = inject(AuthService);
  private translate = inject(TranslateService);
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ homeOutline, colorPaletteOutline, cubeOutline, personOutline, logOutOutline, logInOutline });
    this.translate.use('es');
  }

  async openAuthModal() {
    const modal = await this.modalCtrl.create({
      component: AuthModalComponent,
    });
    await modal.present();
  }
}
