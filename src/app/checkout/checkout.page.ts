import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonInput, IonItem, IonLabel, IonButton, IonSpinner, IonCard, IonCardContent } from '@ionic/angular/standalone';
import { EditorStoreService } from '../services/editor-store.service';
import { CatalogService, Frame } from '../services/catalog.service';
import { PaymentService } from '../services/payment';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, IonButtons, IonBackButton, IonInput, IonItem, IonLabel, IonButton, IonSpinner, IonCard, IonCardContent]
})
export class CheckoutPage implements OnInit, OnDestroy {
  checkoutForm: FormGroup;
  isProcessing = false;

  styledImage: string | null = null;
  selectedFrameId: string | null = null;
  selectedFrameDetail: Frame | null = null;
  
  shippingCost = 15.00;
  totalCost = 0;

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private editorStore: EditorStoreService,
    private catalogService: CatalogService,
    private paymentService: PaymentService,
    private router: Router
  ) {
    this.checkoutForm = this.fb.group({
      name: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.subs.add(this.editorStore.styledImage$.subscribe(img => {
      this.styledImage = img;
    }));
    
    this.subs.add(this.editorStore.selectedFrameId$.subscribe(id => {
      this.selectedFrameId = id;
      this.loadFrameDetails();
    }));
  }

  loadFrameDetails() {
    if (this.selectedFrameId) {
      this.subs.add(this.catalogService.getCatalog().subscribe(catalog => {
        const frame = catalog.frames.find(f => f.id === this.selectedFrameId);
        if (frame) {
          this.selectedFrameDetail = frame;
          this.totalCost = frame.price + this.shippingCost;
        }
      }));
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async onPay() {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.isProcessing = true;
    
    // Simulate saving order to Firestore 'Paid' and getting Stripe success
    this.paymentService.processPayment(this.totalCost).subscribe(success => {
      this.isProcessing = false;
      if (success) {
         // Create dummy order data
         const dummyOrderId = 'ORD-' + Math.floor(Math.random() * 100000);
         this.router.navigate(['/order-confirmation'], { queryParams: { orderId: dummyOrderId }});
      }
    });
  }
}
