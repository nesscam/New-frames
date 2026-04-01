import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, ModalController, IonCard, IonText } from '@ionic/angular/standalone';
import { EditorModalComponent } from '../components/editor-modal/editor-modal.component';
import { AuthModalComponent } from '../components/auth-modal/auth-modal.component';
import { AuthService } from '../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle } from 'ionicons/icons';
import { Firestore, collection, query, where, onSnapshot } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonButton, IonIcon, CommonModule, TranslateModule],
})
export class HomePage implements OnInit, OnDestroy {

  galleryInspirations = [
    { style: 'Cyberpunk', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80' },
    { style: 'Oil Painting', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=200&q=80' }
  ];

  userCreations: any[] = [];

  orders = [
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', status: 'Pnippto', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=100&q=80' },
    { id: '#Processing', details: 'Size: 11x14, Material, Wood', status: 'Shipped', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=100&q=80' },
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', date: '20120221', status: 'Shipped', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=100&q=80' }
  ];

  private authSub?: Subscription;
  private unsubscribeArt?: () => void;

  constructor(private modalCtrl: ModalController, public authService: AuthService, private firestore: Firestore) {
    addIcons({ searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle });
  }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe(user => {
      if (user) {
        this.loadUserArt(user.uid);
      } else {
        this.userCreations = [];
        if (this.unsubscribeArt) {
          this.unsubscribeArt();
          this.unsubscribeArt = undefined;
        }
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    if (this.unsubscribeArt) this.unsubscribeArt();
  }

  loadUserArt(uid: string) {
    if (this.unsubscribeArt) this.unsubscribeArt();
    
    const artRef = collection(this.firestore, 'my_art');
    const q = query(artRef, where('userId', '==', uid));
    
    this.unsubscribeArt = onSnapshot(q, (snapshot) => {
      const creations: any[] = [];
      snapshot.forEach(doc => {
        creations.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      this.userCreations = creations.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
    });
  }

  async openAuthModal() {
    const modal = await this.modalCtrl.create({
      component: AuthModalComponent,
    });
    await modal.present();
  }

  async openEditorModal(preselectedStyle?: string) {
    const modal = await this.modalCtrl.create({
      component: EditorModalComponent,
      componentProps: {
        preselectedStyle: preselectedStyle
      }
    });

    await modal.present();

    // When closed, you could optionally refresh the dashboard
    // const { data } = await modal.onWillDismiss();
  }

}
