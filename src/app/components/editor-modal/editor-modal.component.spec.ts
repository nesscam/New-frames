import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideIonicAngular, ModalController } from '@ionic/angular/standalone';
import { EditorModalComponent } from './editor-modal.component';
import { of } from 'rxjs';

describe('EditorModalComponent', () => {
  let component: EditorModalComponent;
  let fixture: ComponentFixture<EditorModalComponent>;

  beforeEach(waitForAsync(() => {
    const modalSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    // Mock fabric
    (window as any).fabric = {
      Canvas: jasmine.createSpy().and.returnValue({
        dispose: jasmine.createSpy(),
        clear: jasmine.createSpy(),
        add: jasmine.createSpy(),
        renderAll: jasmine.createSpy(),
        width: 300,
        height: 400
      })
    };

    TestBed.configureTestingModule({
      imports: [EditorModalComponent],
      providers: [
        provideIonicAngular(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ModalController, useValue: modalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
