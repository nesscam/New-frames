import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';
import { OrderConfirmationPage } from './order-confirmation.page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

describe('OrderConfirmationPage', () => {
  let component: OrderConfirmationPage;
  let fixture: ComponentFixture<OrderConfirmationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        TranslateService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => '123'
              }
            },
            queryParams: of({ orderId: '123' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderConfirmationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
