import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditorModalComponent } from './editor-modal.component';

describe('EditorModalComponent', () => {
  let component: EditorModalComponent;
  let fixture: ComponentFixture<EditorModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [EditorModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
