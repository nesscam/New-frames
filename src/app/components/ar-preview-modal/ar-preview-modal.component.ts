import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonSpinner, IonText,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, expandOutline, contractOutline,
  cameraOutline, imageOutline, checkmarkCircleOutline
} from 'ionicons/icons';

// ── Frame size map: catalog ID or size string → physical dimensions in inches ──────────────
const FRAME_SIZES_INCHES: Record<string, { w: number; h: number; label: string }> = {
  '8x8':   { w: 8,  h: 8,  label: '8" × 8"' },
  '12x12': { w: 12, h: 12, label: '12" × 12"' },
  '14x14': { w: 14, h: 14, label: '14" × 14"' },
  '16x16': { w: 16, h: 16, label: '16" × 16"' },
  '16x24': { w: 16, h: 24, label: '16" × 24"' },
  '18x24': { w: 18, h: 24, label: '18" × 24"' },
  '20x24': { w: 20, h: 24, label: '20" × 24"' },
  '24x32': { w: 24, h: 32, label: '24" × 32"' },
  '24x36': { w: 24, h: 36, label: '24" × 36"' },
  // Fallbacks for catalog IDs
  'canvas-std': { w: 12, h: 18, label: '12" × 18"' },
  'poster-std':  { w: 18, h: 24, label: '18" × 24"' },
  'marco-lux':   { w: 11, h: 14, label: '11" × 14"' },
};
const INCHES_TO_METERS = 0.0254;
const INCHES_TO_CM = 2.54;

@Component({
  selector: 'app-ar-preview-modal',
  templateUrl: './ar-preview-modal.component.html',
  styleUrls: ['./ar-preview-modal.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonIcon, IonSpinner, IonText,
  ],
})
export class ArPreviewModalComponent implements OnInit, OnDestroy {
  /** URL of the styled/original image to preview */
  @Input() imageUrl!: string;
  /** Frame catalog ID — determines physical size displayed */
  @Input() frameId: string = 'poster-std';
  /** Chosen frame style/color */
  @Input() frameStyle: string = 'none';

  @ViewChild('videoEl')    videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl')   canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayEl')  overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('frameEl')    frameRef!: ElementRef<HTMLDivElement>;

  // ── State ────────────────────────────────────────────────────────────────
  mode: 'detecting' | 'webxr' | 'magic-window' | 'error' = 'detecting';
  errorMessage = '';
  isLoading = true;
  screenshotTaken = false;

  // Magic-window drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private frameX = 0;
  private frameY = 0;
  private frameScale = 1;
  private pinchStartDist = 0;
  private pinchStartScale = 1;

  // WebXR
  private xrSession: any = null;
  private xrRefSpace: any = null;
  private hitTestSource: any = null;
  private renderer: any = null; // Three.js WebGLRenderer
  private scene: any = null;
  private camera: any = null;
  private frameMesh: any = null;
  private reticle: any = null;
  private xrAnimFrameId: number | null = null;

  // Camera stream
  private cameraStream: MediaStream | null = null;

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, expandOutline, contractOutline, cameraOutline, imageOutline, checkmarkCircleOutline });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit() {
    await this.detectOrientation();
    this.initAr();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  // ── Physical frame dimensions ─────────────────────────────────────────────

  get frameDimensions() {
    return FRAME_SIZES_INCHES[this.frameId] ?? { w: 12, h: 18, label: '12" × 18"' };
  }

  get frameLabelCm(): string {
    const d = this.frameDimensions;
    return `${(d.w * INCHES_TO_CM).toFixed(0)} × ${(d.h * INCHES_TO_CM).toFixed(0)} cm`;
  }

  get frameAspectRatio(): number {
    const d = this.frameDimensions;
    // Check orientation based on image metadata or simple width/height ratio if we had image info here
    // For now, we'll follow the logical size provided.
    return d.w / d.h;
  }

  // Detect image orientation from URL if possible
  private isLandscapeImage = false;
  private async detectOrientation() {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.isLandscapeImage = img.width > img.height;
        resolve();
      };
      img.src = this.imageUrl;
    });
  }

  public getAdjustedDimensions() {
    const d = this.frameDimensions;
    let w = d.w;
    let h = d.h;
    if (this.isLandscapeImage && h > w) [w, h] = [h, w];
    if (!this.isLandscapeImage && w > h) [w, h] = [h, w];
    return { w, h };
  }

  // ── AR init — detect WebXR support and choose mode ───────────────────────

  private async initAr() {
    this.isLoading = true;
    try {
      const webxrSupported = !!(navigator as any).xr &&
        await (navigator as any).xr.isSessionSupported('immersive-ar').catch(() => false);

      if (webxrSupported) {
        await this.startWebXR();
      } else {
        await this.startMagicWindow();
      }
    } catch (err: any) {
      console.error('[AR] Init failed:', err);
      this.errorMessage = err.message || 'No se pudo acceder a la cámara.';
      this.mode = 'error';
      this.isLoading = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1 — WebXR (Android Chrome)
  // ═══════════════════════════════════════════════════════════════════════════

  private async startWebXR() {
    this.mode = 'webxr';

    // Lazy-load Three.js only when WebXR is available
    const THREE = await import('three');

    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Ambient + directional light for the picture frame
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(1, 2, 2);
    this.scene.add(dirLight);

    // Reticle — shows where the frame will be placed
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.7, transparent: true, side: THREE.DoubleSide });
    const reticleGeo = new THREE.RingGeometry(0.05, 0.07, 32);
    reticleGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // Frame mesh with the artwork texture
    const texture = await new THREE.TextureLoader().loadAsync(this.imageUrl);
    const d = this.getAdjustedDimensions();

    // PHYSICAL SCALE: Convert inches to real-world meters for WebXR
    const frameW = d.w * INCHES_TO_METERS;
    const frameH = d.h * INCHES_TO_METERS;

    // ── Artwork Plane ──
    const geo = new THREE.PlaneGeometry(frameW, frameH);
    const mat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
    this.frameMesh = new THREE.Mesh(geo, mat);
    this.frameMesh.visible = false;
    this.scene.add(this.frameMesh);

    // ── Outer Frame (The actual physical 3D frame) ──
    const borderThickness = 0.04; // 4cm border width
    const frameDepth = 0.02; // 2cm physical thickness
    const outerGeo = new THREE.BoxGeometry(frameW + borderThickness, frameH + borderThickness, frameDepth);
    
    let borderColor = 0x000000;
    if (this.frameStyle === 'white') borderColor = 0xffffff;
    if (this.frameStyle === 'brown') borderColor = 0x5D4037;
    if (this.frameStyle === 'natural') borderColor = 0xD2B48C;

    const outerMat = new THREE.MeshStandardMaterial({ color: borderColor });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    
    // Position the box so its front face is at z=0, and the artwork is slightly in front
    outerMesh.position.z = -frameDepth / 2; 
    this.frameMesh.add(outerMesh);

    // Start XR session with hit-test
    const session = await (navigator as any).xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['plane-detection'],
    });
    this.xrSession = session;
    this.renderer.xr.setSession(session);

    session.addEventListener('end', () => this.onXrSessionEnd());

    const viewerSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    this.xrRefSpace    = await session.requestReferenceSpace('local');

    // XR render loop
    this.renderer.setAnimationLoop((time: number, frame: any) => this.onXrFrame(frame));

    this.isLoading = false;
  }

  private onXrFrame(frame: any) {
    if (!frame || !this.hitTestSource || !this.xrRefSpace) return;

    const hitResults = frame.getHitTestResults(this.hitTestSource);
    if (hitResults.length > 0) {
      const pose = hitResults[0].getPose(this.xrRefSpace);
      if (pose) {
        const THREE = { Matrix4: (window as any).__THREE_Matrix4__ };
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);
        this.reticle.matrix.decompose(
          this.reticle.position,
          this.reticle.quaternion,
          this.reticle.scale
        );
      }
    } else {
      this.reticle.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /** User taps to place the frame on detected surface */
  placeFrameWebXR() {
    if (!this.reticle.visible || !this.frameMesh) return;
    this.frameMesh.position.copy(this.reticle.position);
    this.frameMesh.quaternion.copy(this.reticle.quaternion);
    this.frameMesh.visible = true;
  }

  private onXrSessionEnd() {
    this.xrSession = null;
    this.mode = 'detecting';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2 — Magic Window (iOS + fallback)
  // ═══════════════════════════════════════════════════════════════════════════

  private async startMagicWindow() {
    this.mode = 'magic-window'; // ← renders <video> in DOM immediately

    // Request camera stream
    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });

    // Wait ONE tick for Angular to render the <video> element,
    // then attach the stream. Without this the video element is null.
    setTimeout(() => {
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.cameraStream!;
        video.play().catch(() => {}); // autoplay policy safe
      }

      // Position frame centered on screen
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // PHYSICAL SCALE (SIMULATED):
      // We assume that at a 'normal' distance, a 36" width takes up 85% of the screen.
      // We scale smaller frames proportionally.
      const referenceInches = 36;
      const referenceWidthRatio = 0.85;
      const currentFrameInches = this.frameDimensions.w;

      const fw = vw * referenceWidthRatio * (currentFrameInches / referenceInches);
      const fh = fw / this.frameAspectRatio;

      this.frameX = (vw - fw) / 2;
      this.frameY = (vh - fh) / 2;
      this.frameScale = 1;

      // Show UI overlay
      this.isLoading = false;

      // Apply initial frame position after overlay renders
      setTimeout(() => this.applyFrameTransform(), 0);
    }, 0);
  }

  // ── Touch / Pointer handlers for drag & pinch-to-zoom ─────────────────────

  onFramePointerDown(event: PointerEvent) {
    event.preventDefault();
    this.isDragging = true;
    this.dragStartX = event.clientX - this.frameX;
    this.dragStartY = event.clientY - this.frameY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onFramePointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    this.frameX = event.clientX - this.dragStartX;
    this.frameY = event.clientY - this.dragStartY;
    this.applyFrameTransform();
  }

  onFramePointerUp(event: PointerEvent) {
    this.isDragging = false;
  }

  onFrameTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.isDragging = false;
      this.pinchStartDist = this.getTouchDist(event);
      this.pinchStartScale = this.frameScale;
    }
  }

  onFrameTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length === 2) {
      const dist  = this.getTouchDist(event);
      this.frameScale = Math.max(0.3, Math.min(3, this.pinchStartScale * (dist / this.pinchStartDist)));
      this.applyFrameTransform();
    }
  }

  private getTouchDist(event: TouchEvent): number {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private applyFrameTransform() {
    const el = this.frameRef?.nativeElement;
    if (!el) return;
    el.style.transform = `translate(${this.frameX}px, ${this.frameY}px) scale(${this.frameScale})`;
  }

  // ── Screenshot ─────────────────────────────────────────────────────────────

  async takeScreenshot() {
    const video   = this.videoRef?.nativeElement;
    const frameEl = this.frameRef?.nativeElement;
    if (!video || !frameEl) return;

    const canvas  = document.createElement('canvas');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx     = canvas.getContext('2d')!;

    // Draw camera frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw artwork overlay
    const img   = new Image();
    img.crossOrigin = 'anonymous';
    img.src     = this.imageUrl;
    await new Promise(r => { img.onload = r; img.onerror = r; });

    // Draw frame border (if any)
    const rect  = frameEl.getBoundingClientRect();
    const borderSize = 20 * (rect.width / frameEl.offsetWidth); // scale border size to match transform

    if (this.frameStyle !== 'none') {
      let borderColor = '#000000';
      if (this.frameStyle === 'white') borderColor = '#ffffff';
      if (this.frameStyle === 'brown') borderColor = '#5D4037';
      if (this.frameStyle === 'natural') borderColor = '#D2B48C';
      
      ctx.fillStyle = borderColor;
      // Draw background box (the frame)
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);

      // Insets for gold/silver lines
      if (this.frameStyle === 'black-gold' || this.frameStyle === 'black-silver') {
        const lineOffset = 11 * (rect.width / frameEl.offsetWidth);
        const lineWidth = 2 * (rect.width / frameEl.offsetWidth);
        ctx.strokeStyle = this.frameStyle === 'black-gold' ? '#d4af37' : '#c0c0c0';
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(rect.left + lineOffset, rect.top + lineOffset, rect.width - (lineOffset * 2), rect.height - (lineOffset * 2));
      }

      // Draw artwork on top, inset by border size
      ctx.drawImage(img, rect.left + borderSize, rect.top + borderSize, rect.width - (borderSize * 2), rect.height - (borderSize * 2));
    } else {
      // No frame
      ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link    = document.createElement('a');
    link.href     = dataUrl;
    link.download = 'new-frames-preview.jpg';
    link.click();

    this.screenshotTaken = true;
    setTimeout(() => this.screenshotTaken = false, 2000);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private cleanup() {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {});
      this.xrSession = null;
    }
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      this.renderer.dispose();
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
  }

  dismiss() {
    this.cleanup();
    this.modalCtrl.dismiss();
  }
}
