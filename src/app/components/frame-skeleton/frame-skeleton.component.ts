import { Component } from '@angular/core';
import { IonList, IonItem, IonLabel, IonSkeletonText, IonThumbnail } from '@ionic/angular/standalone';

@Component({
  selector: 'app-frame-skeleton',
  template: `
    <ion-list>
      @for (item of [1,2,3,4,5]; track item) {
        <ion-item>
          <ion-thumbnail slot="start">
            <ion-skeleton-text animated></ion-skeleton-text>
          </ion-thumbnail>
          <ion-label>
            <h3>
              <ion-skeleton-text animated style="width: 50%;"></ion-skeleton-text>
            </h3>
            <p>
              <ion-skeleton-text animated style="width: 80%;"></ion-skeleton-text>
            </p>
            <p>
              <ion-skeleton-text animated style="width: 30%;"></ion-skeleton-text>
            </p>
          </ion-label>
        </ion-item>
      }
    </ion-list>
  `,
  standalone: true,
  imports: [IonList, IonItem, IonLabel, IonSkeletonText, IonThumbnail]
})
export class FrameSkeletonComponent {}
