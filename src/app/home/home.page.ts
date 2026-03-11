import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, ModalController, IonCard, IonText } from '@ionic/angular/standalone';
import { EditorModalComponent } from '../components/editor-modal/editor-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonCard, IonText, CommonModule],
})
export class HomePage implements OnInit {

  inspirations = [
    { style: 'Cyberpunk', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { style: 'Óleo', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { style: 'Acuarela', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { style: 'Pop Art', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }
  ];

  creations: any[] = [];
  
  orders = [
    { id: 'ORD-12345', status: 'En Preparación', date: '10 Mar 2026' }
  ];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    // Optionally fetch creations and orders from a real service later
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
