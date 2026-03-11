import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, colorPaletteOutline, cubeOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel, RouterModule],
})
export class AppComponent {
  constructor() {
    addIcons({ homeOutline, colorPaletteOutline, cubeOutline, personOutline });
  }
}
