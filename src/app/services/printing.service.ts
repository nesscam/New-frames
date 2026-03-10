import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrintingService {

  constructor() { }

  /**
   * Submits an order for printing.
   * Currently only logs the order data to the console.
   *
   * @param size The size of the print (e.g., '4x6', '8x10').
   * @param frame The type of frame (e.g., 'none', 'black', 'wood').
   * @param imageUrl The URL of the image to be printed.
   */
  submitOrder(size: string, frame: string, imageUrl: string): void {
    console.log('Order submitted for printing:');
    console.log(`Size: ${size}`);
    console.log(`Frame: ${frame}`);
    console.log(`Image URL: ${imageUrl}`);

    // TODO: Implement actual API call to printing service
  }
}
