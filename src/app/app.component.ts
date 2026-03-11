import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel, RouterModule],
})
export class AppComponent {
  constructor() {}
}
