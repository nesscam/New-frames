import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, colorPaletteOutline, cubeOutline, personOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from './services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel, RouterModule, CommonModule, TranslateModule],
})
export class AppComponent {
  public authService = inject(AuthService);
  private translate = inject(TranslateService);

  constructor() {
    addIcons({ homeOutline, colorPaletteOutline, cubeOutline, personOutline, logOutOutline });
    this.translate.use('es');
  }
}
