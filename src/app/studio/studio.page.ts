import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon, ModalController, IonSpinner } from '@ionic/angular/standalone';
import { Firestore, collection, query, where, onSnapshot, doc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';
import { EditorModalComponent } from '../components/editor-modal/editor-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { colorPaletteOutline, imageOutline, trashOutline, cartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.page.html',
  styleUrls: ['./studio.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, IonSpinner, CommonModule, TranslateModule, EditorModalComponent]
})
export class StudioPage implements OnInit, OnDestroy {
  activeTab: 'creations' | 'originals' = 'creations';
  userCreations: any[] = [];
  userOriginals: any[] = [];
  isLoading = true;

  private authSub?: Subscription;
  private unsubCreations?: () => void;
  private unsubOriginals?: () => void;

  constructor(
    public authService: AuthService,
    private firestore: Firestore,
    private modalCtrl: ModalController
  ) {
    addIcons({ colorPaletteOutline, imageOutline, trashOutline, cartOutline });
  }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe(user => {
      if (user) {
        this.loadData(user.uid);
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    if (this.unsubCreations) this.unsubCreations();
    if (this.unsubOriginals) this.unsubOriginals();
  }

  loadData(uid: string) {
    this.isLoading = true;
    
    // Load IA Creations
    const creationsRef = collection(this.firestore, 'my_art');
    const qC = query(creationsRef, where('userId', '==', uid));
    this.unsubCreations = onSnapshot(qC, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this.userCreations = items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      this.isLoading = false;
    });

    // Load Originals
    const originalsRef = collection(this.firestore, 'original_photos');
    const qO = query(originalsRef, where('userId', '==', uid));
    this.unsubOriginals = onSnapshot(qO, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this.userOriginals = items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    });
  }

  async makeOrder(item: any) {
    const modal = await this.modalCtrl.create({
      component: EditorModalComponent,
      componentProps: {
        // Pass the existing image to start with it
        existingImage: item.imageUrl || item.image
      },
      cssClass: 'full-screen-modal'
    });
    await modal.present();
  }

  async deleteItem(item: any, collectionName: 'my_art' | 'original_photos') {
    if (confirm('¿Estás seguro de que quieres borrar esta imagen?')) {
      await deleteDoc(doc(this.firestore, collectionName, item.id));
    }
  }

  setTab(tab: 'creations' | 'originals') {
    this.activeTab = tab;
  }
}
