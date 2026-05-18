import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonMenuButton, IonButtons, ModalController } from '@ionic/angular/standalone';
import { EditorModalComponent } from '../components/editor-modal/editor-modal.component';
import { AuthModalComponent } from '../components/auth-modal/auth-modal.component';
import { AuthService } from '../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trashOutline, cartOutline, searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle, createOutline, starOutline, personOutline } from 'ionicons/icons';
import { Firestore, collection, query, where, onSnapshot, doc, deleteDoc } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, IonMenuButton, IonButtons, CommonModule, TranslateModule, EditorModalComponent],
})
export class HomePage implements OnInit, OnDestroy {

  galleryInspirations = [
    { style: 'Cyberpunk', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80' },
    { style: 'Oil Painting', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=200&q=80' }
  ];

  userCreations: any[] = [];
  userOriginals: any[] = [];

  orders = [
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', status: 'Pnippto', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=100&q=80' },
    { id: '#Processing', details: 'Size: 11x14, Material, Wood', status: 'Shipped', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=100&q=80' },
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', date: '20120221', status: 'Shipped', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=100&q=80' }
  ];

  private authSub?: Subscription;
  private unsubscribeArt?: () => void;
  private unsubscribeOrig?: () => void;

  constructor(
    private modalCtrl: ModalController, 
    public authService: AuthService, 
    private firestore: Firestore, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ trashOutline, cartOutline, searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle, createOutline, starOutline, personOutline });
  }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe(user => {
      if (user) {
        this.loadUserArt(user.uid);
        this.route.queryParams.subscribe(params => {
          if (params['reopen']) {
            this.openEditorModal();
          }
        });
      } else {
        this.router.navigate(['/landing'], { replaceUrl: true });
        this.userCreations = [];
        this.userOriginals = [];
        if (this.unsubscribeArt) this.unsubscribeArt();
        if (this.unsubscribeOrig) this.unsubscribeOrig();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    if (this.unsubscribeArt) this.unsubscribeArt();
    if (this.unsubscribeOrig) this.unsubscribeOrig();
  }

  loadUserArt(uid: string) {
    // IA Creations
    if (this.unsubscribeArt) this.unsubscribeArt();
    const artRef = collection(this.firestore, 'my_art');
    const qC = query(artRef, where('userId', '==', uid));
    this.unsubscribeArt = onSnapshot(qC, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this.userCreations = items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    });

    // Originals
    if (this.unsubscribeOrig) this.unsubscribeOrig();
    const origRef = collection(this.firestore, 'original_photos');
    const qO = query(origRef, where('userId', '==', uid));
    this.unsubscribeOrig = onSnapshot(qO, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this.userOriginals = items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      console.log('Originals loaded:', this.userOriginals.length);
    });
  }

  async openAuthModal() {
    const modal = await this.modalCtrl.create({ component: AuthModalComponent });
    await modal.present();
  }

  async openEditorModal(preselectedStyle?: string, existingImage?: string) {
    const modal = await this.modalCtrl.create({
      component: EditorModalComponent,
      componentProps: { 
        preselectedStyle: preselectedStyle,
        existingImage: existingImage
      },
      cssClass: 'full-screen-modal'
    });
    await modal.present();
  }

  async deleteItem(item: any, collectionName: string) {
    if (confirm('¿Borrar esta imagen?')) {
      await deleteDoc(doc(this.firestore, collectionName, item.id));
    }
  }
}
