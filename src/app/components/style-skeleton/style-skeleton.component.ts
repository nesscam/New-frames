import { Component } from '@angular/core';
import { IonGrid, IonRow, IonCol, IonSkeletonText, IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-style-skeleton',
  template: `
    <ion-grid>
      <ion-row>
        @for (item of [1,2,3,4,5,6,7,8,9]; track item) {
          <ion-col size="4">
            <ion-card>
              <ion-skeleton-text animated style="width: 100%; height: 100px;"></ion-skeleton-text>
              <ion-card-content>
                <ion-skeleton-text animated style="width: 60%;"></ion-skeleton-text>
              </ion-card-content>
            </ion-card>
          </ion-col>
        }
      </ion-row>
    </ion-grid>
  `,
  standalone: true,
  imports: [IonGrid, IonRow, IonCol, IonSkeletonText, IonCard, IonCardContent]
})
export class StyleSkeletonComponent {}
