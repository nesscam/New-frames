import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EditorStoreService } from '../services/editor-store.service';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.page.html',
  styleUrls: ['./order-confirmation.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, TranslateModule]
})
export class OrderConfirmationPage implements OnInit {
  orderId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private editorStore: EditorStoreService
  ) { }

  ngOnInit() {
    this.orderId = this.route.snapshot.queryParamMap.get('orderId') || '';
    // Clear the editor store after a successful purchase
    this.editorStore.resetState();
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}
