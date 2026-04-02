import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonItem, IonLabel, IonInput, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-add-address-modal',
  templateUrl: './add-address-modal.component.html',
  styleUrls: ['./add-address-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonItem, IonLabel, IonInput, IonIcon, IonGrid, IonRow, IonCol]
})
export class AddAddressModalComponent implements OnInit {
  addressForm: FormGroup;
  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, saveOutline });
    this.addressForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  save() {
    if (this.addressForm.valid) {
      this.modalCtrl.dismiss(this.addressForm.value, 'confirm');
    } else {
      this.addressForm.markAllAsTouched();
    }
  }
}
