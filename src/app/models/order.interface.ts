import { Timestamp, FieldValue } from '@angular/fire/firestore';

/** Estado del pago, gestionado exclusivamente por el backend (Cloud Functions). */
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/** Estado del cumplimiento/fulfillment (Sensaria), gestionado exclusivamente por el backend. */
export type OrderFulfillmentStatus =
  | 'pending'
  | 'submitted'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'failed';

export interface OrderItem {
  frameId: string;
  imageUrl: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Documento de la colección Firestore `orders/{orderId}`.
 * Escrito únicamente por el Admin SDK (Cloud Functions) -- ver firestore.rules.
 */
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingAddress?: OrderShippingAddress;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
