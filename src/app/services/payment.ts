import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor() { }

  /**
   * Simulates a payment transaction with Stripe.
   *
   * @param amount The amount to charge.
   * @returns An observable that resolves to true after a simulated delay.
   */
  processPayment(amount: number): Observable<boolean> {
    // Simulate API delay
    return of(true).pipe(delay(2000));
  }
}
