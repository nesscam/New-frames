import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, ModalController, IonCard, IonText } from '@ionic/angular/standalone';
import { EditorModalComponent } from '../components/editor-modal/editor-modal.component';
import { AuthModalComponent } from '../components/auth-modal/auth-modal.component';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonCard, IonText, CommonModule],
})
export class HomePage implements OnInit {

  galleryInspirations = [
    { style: 'Cyberpunk', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=200&q=80' },
    { style: 'Watercolor', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80' },
    { style: 'Oil Painting', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=200&q=80' }
  ];

  userCreations = [
    { style: 'Neon City', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=200&q=80' },
    { style: 'Pop Art Portrait', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=200&q=80' },
    { style: 'Classic Landscape', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=200&q=80' }
  ];

  orders = [
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', status: 'Pnippto', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=100&q=80' },
    { id: '#Processing', details: 'Size: 11x14, Material, Wood', status: 'Shipped', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=100&q=80' },
    { id: '#AF-3024-001', details: 'Size: 11x14, Material, Wood', date: '20120221', status: 'Shipped', image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=100&q=80' }
  ];

  constructor(private modalCtrl: ModalController, public authService: AuthService) {
    addIcons({ searchOutline, notificationsOutline, alertOutline, cameraOutline, folderOutline, imagesOutline, personCircleOutline, colorPaletteOutline, cubeOutline, logoGoogle });
  }

  ngOnInit() {
    // Optionally fetch creations and orders from a real service later
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
