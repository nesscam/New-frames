import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, IonFooter } from '@ionic/angular/standalone';
import { EditorStoreService, OrderStep } from '../services/editor-store.service';
import { CatalogService, Frame } from '../services/catalog.service';
import { AiPromptService } from '../services/ai-prompt.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
declare var fabric: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, IonFooter, CommonModule],
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas') canvasEl!: ElementRef<HTMLCanvasElement>;
  
  canvas: any;
  
  currentStep: OrderStep = 'upload';
  originalImage: string | null = null;
  styledImage: string | null = null;
  selectedFrameId: string | null = null;
  
  frames: Frame[] = [];
  styles: string[] = ['Original', 'Cyberpunk', 'Watercolor', 'Oil Painting', 'Sketch', 'Comic'];
  
  isApplyingStyle = false;

  private subs = new Subscription();

  constructor(
    private editorStore: EditorStoreService,
    private catalogService: CatalogService,
    private aiPromptService: AiPromptService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subs.add(this.editorStore.orderStep$.subscribe(step => this.currentStep = step));
    this.subs.add(this.editorStore.originalImage$.subscribe(img => this.originalImage = img));
    this.subs.add(this.editorStore.styledImage$.subscribe(img => this.styledImage = img));
    this.subs.add(this.editorStore.selectedFrameId$.subscribe(id => this.selectedFrameId = id));

    this.subs.add(this.catalogService.getCatalog().subscribe(catalog => {
      this.frames = catalog.frames;
    }));
  }

  ngAfterViewInit() {
    this.initFabric();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.canvas) {
      this.canvas.dispose();
    }
  }

  initFabric() {
    this.canvas = new fabric.Canvas(this.canvasEl.nativeElement, {
      width: 300,
      height: 400,
      backgroundColor: '#2a2a2a'
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageUrl = e.target.result;
        this.editorStore.setOriginalImage(imageUrl);
        this.loadImageToCanvas(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  loadImageToCanvas(imageUrl: string) {
    if (!this.canvas) return;
    this.canvas.clear();
    this.canvas.backgroundColor = '#2a2a2a';
    
    fabric.Image.fromURL(imageUrl, (img: any) => {
      // Scale image to fit canvas
      const scaleX = this.canvas.width! / img.width!;
      const scaleY = this.canvas.height! / img.height!;
      const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave a tiny padding inside the 'frame'

      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: this.canvas.width! / 2,
        top: this.canvas.height! / 2,
        selectable: false
      });
      
      this.canvas.add(img);
      this.canvas.renderAll();
    });
  }

  applyStyle(styleName: string) {
    if (!this.originalImage) return;
    if (styleName === 'Original') {
       this.editorStore.setStyledImage(this.originalImage);
       return;
    }
    
    this.isApplyingStyle = true;
    
    // Call the AI proxy service using environment config
    this.subs.add(
      this.aiPromptService.processImage(this.originalImage, styleName).subscribe({
        next: (result) => {
          this.isApplyingStyle = false;
          // In real scenario result would have the new base64/url
          // For now we set it to original to continue flow if it succeeds
          const returnedImg = result?.imageUrl || this.originalImage;
          this.editorStore.setStyledImage(returnedImg);
        },
        error: (err) => {
           console.error("Failed to generate AI stylistic image", err);
           this.isApplyingStyle = false;
           // Fallback for testing:
           this.editorStore.setStyledImage(this.originalImage);
        }
      })
    );
  }

  selectFrame(frameId: string) {
    this.editorStore.setSelectedFrameId(frameId);
  }

  nextStep() {
    switch(this.currentStep) {
      case 'upload': this.editorStore.setOrderStep('style'); break;
      case 'style': this.editorStore.setOrderStep('frame'); break;
      case 'frame': 
        this.router.navigate(['/checkout']); 
        break;
    }
  }

  prevStep() {
    switch(this.currentStep) {
      case 'style': this.editorStore.setOrderStep('upload'); break;
      case 'frame': this.editorStore.setOrderStep('style'); break;
      case 'checkout': this.editorStore.setOrderStep('frame'); break;
    }
  }
}
