import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout.page').then( m => m.CheckoutPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'order-confirmation',
    loadComponent: () => import('./order-confirmation/order-confirmation.page').then( m => m.OrderConfirmationPage),
    canActivate: [AuthGuard]
  },
];
