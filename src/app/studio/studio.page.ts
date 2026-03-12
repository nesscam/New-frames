import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonIcon,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonSpinner,
  IonText
} from '@ionic/angular/standalone';
import { Firestore, collection, query, where, collectionData, doc, updateDoc, orderBy } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import { heart, heartOutline, shareOutline, downloadOutline } from 'ionicons/icons';

interface ArtItem {
  id: string;
  imageUrl: string;
  style: string;
  isFavorite: boolean;
  createdAt: any;
}

@Component({
  selector: 'app-studio',
  templateUrl: './studio.page.html',
  styleUrls: ['./studio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonIcon,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonSpinner,
    IonText,
    TranslateModule
  ]
})
export class StudioPage implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  artItems$: Observable<ArtItem[]> = of([]);

  constructor() {
    addIcons({ heart, heartOutline, shareOutline, downloadOutline });
  }

  ngOnInit() {
    this.artItems$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        const artRef = collection(this.firestore, 'my_art');
        const q = query(
          artRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<ArtItem[]>;
      })
    );
  }

  async toggleFavorite(item: ArtItem) {
    const docRef = doc(this.firestore, `my_art/${item.id}`);
    await updateDoc(docRef, {
      isFavorite: !item.isFavorite
    });
  }
}
