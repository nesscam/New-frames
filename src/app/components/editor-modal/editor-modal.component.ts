import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, IonFooter, IonButtons, IonIcon, ModalController } from '@ionic/angular/standalone';
import { EditorStoreService, OrderStep } from '../../services/editor-store.service';
import { CatalogService, Frame } from '../../services/catalog.service';
import { AiPromptService } from '../../services/ai-prompt.service';
import { ImageAiService } from '../../services/image-ai.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import * as fabric from 'fabric';
import { addIcons } from 'ionicons';
import { closeOutline, arrowBackOutline } from 'ionicons/icons';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { ArPreviewModalComponent } from '../ar-preview-modal/ar-preview-modal.component';

@Component({
  selector: 'app-editor-modal',
  templateUrl: './editor-modal.component.html',
  styleUrls: ['./editor-modal.component.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, IonFooter, IonButtons, IonIcon, CommonModule, TranslateModule, ArPreviewModalComponent]
})
export class EditorModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() preselectedStyle?: string;
  @Input() existingImage?: string;
  @Input() isInline = false;
  @Output() close = new EventEmitter<void>();

  @ViewChild('fabricCanvas') canvasEl!: ElementRef<HTMLCanvasElement>;

  canvas: any;
  currentStep: OrderStep = 'upload';
  originalImage: string | null = null;
  styledImage: string | null = null;
  selectedFrameId: string | null = '8x8';
  selectedFrameStyle: string = 'black';

  frames: Frame[] = [];
  frameStyles = [
    { id: 'none', label: 'Sin Marco' },
    { id: 'black', label: 'Negro' },
    { id: 'white', label: 'Blanco' },
    { id: 'brown', label: 'Marrón' },
    { id: 'natural', label: 'Natural' },
    { id: 'black-gold', label: 'Negro/Oro' },
    { id: 'black-silver', label: 'Negro/Plata' },
  ];
  styles: string[] = ['Original', 'Cinematic_Royal', 'Luxury_Minimal', 'Fantasy_Epic', 'Renaissance_Masterpiece', 'Dreamy_Watercolor_Gallery', 'Cinematic_Graphic_Novel', 'Cyberpunk_Movie_Poster'];

  isApplyingStyle = false;
  private subs = new Subscription();

  constructor(
    private editorStore: EditorStoreService,
    private catalogService: CatalogService,
    private aiPromptService: AiPromptService,
    private imageAiService: ImageAiService,
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private firestore: Firestore
  ) { 
    addIcons({ closeOutline, arrowBackOutline });
  }

  ngOnInit() {
    this.subs.add(this.editorStore.orderStep$.subscribe(step => this.currentStep = step));
    this.subs.add(this.editorStore.originalImage$.subscribe(img => {
      this.originalImage = img;
      if (img) {
        setTimeout(() => {
          if (!this.canvas) this.initFabric();
          this.loadImageToCanvas(img);
        }, 100);
      }
    }));

    if (this.existingImage) {
      this.editorStore.setOriginalImage(this.existingImage);
      this.editorStore.setOrderStep('style');
    }
    this.subs.add(this.editorStore.styledImage$.subscribe(img => {
      this.styledImage = img;
      if (img) {
        setTimeout(() => {
          if (!this.canvas) this.initFabric();
          this.loadImageToCanvas(img);
        }, 100);
      }
    }));
    this.subs.add(this.editorStore.selectedFrameId$.subscribe(id => this.selectedFrameId = id));
    this.subs.add(this.editorStore.selectedFrameStyle$.subscribe(style => this.selectedFrameStyle = style));

    this.subs.add(this.catalogService.getCatalog().subscribe(catalog => {
      this.frames = catalog.frames;
    }));
  }

  ngAfterViewInit() {
    // Canvas might not be ready yet if originalImage is null
    if (this.originalImage) {
      this.initFabric();
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.canvas) {
      this.canvas.dispose();
    }
  }

  initFabric() {
    if (!this.canvasEl) return;
    this.canvas = new fabric.Canvas(this.canvasEl.nativeElement, {
      width: 300,
      height: 400,
      backgroundColor: 'transparent',
      allowTouchScrolling: true
    });

    // Add Mouse Wheel Zoom for Desktop
    this.canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageAiService.clearUploadCache();
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const imageUrl = e.target.result;
        this.editorStore.setOriginalImage(imageUrl);
        this.editorStore.setOrderStep('style');
        
        // Auto-save original to Firestore
        const user = await this.authService.getCurrentUser();
        if (user) {
          try {
            await addDoc(collection(this.firestore, 'original_photos'), {
              userId: user.uid,
              imageUrl: imageUrl,
              createdAt: serverTimestamp()
            });
            console.log('Original photo saved to Studio');
          } catch (err) {
            console.error('Error saving original photo:', err);
          }
        }

        if (this.preselectedStyle) {
          this.applyStyle(this.preselectedStyle);
        }
        event.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  }

  loadImageToCanvas(imageUrl: string) {
    if (!this.canvas) {
       this.initFabric();
    }
    if (!this.canvas) return;

    this.canvas.clear();
    fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const isLandscape = img.width! > img.height!;
      const sizeData = this.frameStylesMap[this.selectedFrameId || '8x8'] || { w: 8, h: 8 };
      let frameW = sizeData.w;
      let frameH = sizeData.h;
      if (isLandscape && frameH > frameW) [frameW, frameH] = [frameH, frameW];
      else if (!isLandscape && frameW > frameH) [frameW, frameH] = [frameH, frameW];
      
      const frameRatio = frameW / frameH;
      
      // Responsive sizing
      const isDesktop = window.innerWidth > 991;
      const maxWidth = isDesktop ? window.innerWidth * 0.4 : window.innerWidth * 0.85;
      const maxHeight = isDesktop ? window.innerHeight * 0.6 : window.innerHeight * 0.5;
      
      let finalCanvasW, finalCanvasH;
      if (maxWidth / maxHeight > frameRatio) {
        finalCanvasH = maxHeight;
        finalCanvasW = maxHeight * frameRatio;
      } else {
        finalCanvasW = maxWidth;
        finalCanvasH = maxWidth / frameRatio;
      }

      this.canvas.setDimensions({ width: finalCanvasW, height: finalCanvasH });
      const scaleX = finalCanvasW / img.width!;
      const scaleY = finalCanvasH / img.height!;
      const scale = Math.max(scaleX, scaleY);

      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: finalCanvasW / 2,
        top: finalCanvasH / 2,
        selectable: false
      });
      this.canvas.add(img);
      this.canvas.renderAll();
    });
  }

  private frameStylesMap: Record<string, {w: number, h: number}> = {
    '8x8': {w: 8, h: 8}, '12x12': {w: 12, h: 12}, '14x14': {w: 14, h: 14},
    '16x16': {w: 16, h: 16}, '16x24': {w: 16, h: 24}, '18x24': {w: 18, h: 24},
    '20x24': {w: 20, h: 24}, '24x32': {w: 24, h: 32}, '24x36': {w: 24, h: 36}
  };

  async applyStyle(styleName: string) {
    if (!this.originalImage) return;
    if (styleName === 'Original') {
      this.editorStore.setStyledImage(this.originalImage);
      return;
    }
    this.isApplyingStyle = true;
    try {
      const res = await fetch(this.originalImage);
      const blob = await res.blob();
      const user = await this.authService.getCurrentUser();
      if (!user) return;
      this.subs.add(
        this.imageAiService.generateArt(blob, styleName, user.uid).subscribe({
          next: (url) => {
            this.isApplyingStyle = false;
            this.editorStore.setStyledImage(url);
          },
          error: () => {
            this.isApplyingStyle = false;
            this.editorStore.setStyledImage(this.originalImage);
          }
        })
      );
    } catch {
      this.isApplyingStyle = false;
    }
  }

  async openArPreview() {
    const imageToPreview = this.styledImage || this.originalImage;
    if (!imageToPreview) return;
    const modal = await this.modalCtrl.create({
      component: ArPreviewModalComponent,
      componentProps: {
        imageUrl: imageToPreview,
        frameId: this.selectedFrameId ?? '8x8',
        frameStyle: this.selectedFrameStyle,
      },
      cssClass: 'ar-preview-modal'
    });
    await modal.present();
  }

  selectFrame(frameId: string) {
    this.editorStore.setSelectedFrameId(frameId);
    const currentImg = this.styledImage || this.originalImage;
    if (currentImg) this.loadImageToCanvas(currentImg);
  }

  selectFrameStyle(styleId: string) {
    this.editorStore.setSelectedFrameStyle(styleId);
  }

  nextStep() {
    switch (this.currentStep) {
      case 'upload': this.editorStore.setOrderStep('style'); break;
      case 'style': this.editorStore.setOrderStep('frame'); break;
      case 'frame':
        this.dismissModal();
        this.router.navigate(['/checkout']);
        break;
    }
  }

  prevStep() {
    switch (this.currentStep) {
      case 'style': this.editorStore.setOrderStep('upload'); break;
      case 'frame': this.editorStore.setOrderStep('style'); break;
    }
  }

  closeAndReset() {
    this.editorStore.resetState();
    this.modalCtrl.dismiss();
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }
}
