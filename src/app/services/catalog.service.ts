import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Frame {
  id: string;
  style: string;
  material: string;
  size: string;
  price: number;
  currency: string;
}

export interface Catalog {
  catalog_version: string;
  last_updated: string;
  frames: Frame[];
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private catalogUrl = 'assets/data/catalog.json';

  constructor(private http: HttpClient) { }

  /**
   * Fetches the product catalog from the assets.
   * This serves as the source of truth for prices and dimensions.
   */
  getCatalog(): Observable<Catalog> {
    return this.http.get<Catalog>(this.catalogUrl);
  }
}
