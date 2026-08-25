import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideIonicAngular, ModalController } from '@ionic/angular/standalone';
import { HomePage } from './home.page';
import { AuthService } from '../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    const modalSpy = jasmine.createSpyObj('ModalController', ['create']);
    const authSpy = {
      user$: of(null),
      logout: jasmine.createSpy('logout'),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
      signUpWithEmail: jasmine.createSpy('signUpWithEmail')
    };

    await TestBed.configureTestingModule({
      imports: [HomePage, TranslateModule.forRoot()],
      providers: [
        provideIonicAngular(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ModalController, useValue: modalSpy },
        { provide: AuthService, useValue: authSpy },
        TranslateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
