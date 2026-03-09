import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type OrderStep = 'upload' | 'style' | 'frame' | 'checkout';

@Injectable({
  providedIn: 'root'
})
export class EditorStoreService {

  private _originalImage$ = new BehaviorSubject<string | null>(null);
  private _styledImage$ = new BehaviorSubject<string | null>(null);
  private _selectedFrameId$ = new BehaviorSubject<string | null>(null);
  private _orderStep$ = new BehaviorSubject<OrderStep>('upload');

  constructor() { }

  // Getters
  get originalImage$(): Observable<string | null> {
    return this._originalImage$.asObservable();
  }

  get styledImage$(): Observable<string | null> {
    return this._styledImage$.asObservable();
  }

  get selectedFrameId$(): Observable<string | null> {
    return this._selectedFrameId$.asObservable();
  }

  get orderStep$(): Observable<OrderStep> {
    return this._orderStep$.asObservable();
  }

  // Setters
  setOriginalImage(url: string | null): void {
    this._originalImage$.next(url);
  }

  setStyledImage(url: string | null): void {
    this._styledImage$.next(url);
  }

  setSelectedFrameId(id: string | null): void {
    this._selectedFrameId$.next(id);
  }

  setOrderStep(step: OrderStep): void {
    this._orderStep$.next(step);
  }

  /**
   * Resets the editor state to its initial values.
   */
  resetState(): void {
    this._originalImage$.next(null);
    this._styledImage$.next(null);
    this._selectedFrameId$.next(null);
    this._orderStep$.next('upload');
  }
}
