
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BrowserMultiFormatReader,
  IScannerControls
} from '@zxing/browser';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  SilkwormBatch,
  SilkwormRequestService
} from '../../services/silkworm-request.service';

@Component({
  selector: 'app-batch-scan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-scan.html',
  styleUrl: './batch-scan.css',
})
export class BatchScan implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement')
  videoElement!: ElementRef<HTMLVideoElement>;

  private codeReader = new BrowserMultiFormatReader();
  private scannerControls: IScannerControls | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private routeBatchId: string | null = null;
  private viewReady = false;

  farmerUid = '';
  manualBatchValue = '';

  batch: SilkwormBatch | null = null;

  loading = false;
  cameraLoading = false;
  cameraActive = false;
  isProcessing = false;

  showBatchModal = false;

  errorMessage = '';
  successMessage = '';
  cameraError = '';

  constructor(
    private requestService: SilkwormRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const segments = window.location.pathname.split('/');
    const batchIndex = segments.indexOf('batch-scan');

    if (batchIndex !== -1 && segments[batchIndex + 1]) {
      this.routeBatchId = decodeURIComponent(segments[batchIndex + 1]);
    }

    this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      this.farmerUid = user?.uid || '';

      if (!user) {
        this.batch = null;
        this.showBatchModal = false;
        this.errorMessage = 'Please log in to access your silkworm batches.';
        this.cdr.detectChanges();
        return;
      }

      this.cdr.detectChanges();

      if (this.routeBatchId) {
        await this.loadBatch(this.routeBatchId);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  async startCamera(): Promise<void> {
    if (!this.farmerUid) {
      this.cameraError = 'Please log in before using the scanner.';
      return;
    }

    if (!this.viewReady || !this.videoElement?.nativeElement) {
      this.cameraError = 'The camera preview is not ready. Please try again.';
      return;
    }

    if (this.cameraActive || this.cameraLoading) {
      return;
    }

    this.cameraError = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.cameraLoading = true;
    this.isProcessing = false;
    this.batch = null;
    this.showBatchModal = false;

    try {
      this.scannerControls =
        await this.codeReader.decodeFromVideoDevice(
          undefined,
          this.videoElement.nativeElement,
          (result) => {
            if (result && !this.isProcessing) {
              this.isProcessing = true;

              const scannedValue = result.getText();

              this.cdr.detectChanges();

              void this.stopCamera();
              void this.processScannedValue(scannedValue);
            }
          }
        );

      this.cameraActive = true;
    } catch (error) {
      console.error('Camera scanner error:', error);

      this.cameraError =
        'Unable to access the camera. Please allow camera permission or use the manual Batch ID option.';

      this.cameraActive = false;
    } finally {
      this.cameraLoading = false;
      this.cdr.detectChanges();
    }
  }

  stopCamera(): void {
    this.scannerControls?.stop();
    this.scannerControls = null;
    this.cameraActive = false;
    this.cameraLoading = false;

    const video = this.videoElement?.nativeElement;

    if (video?.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

    this.cdr.detectChanges();
  }

  private extractBatchId(value: string): string | null {
    const scannedValue = value.trim();

    if (!scannedValue) {
      return null;
    }

    // Existing PTRI batch QR format.
    if (scannedValue.startsWith('PTRI-BATCH:')) {
      const batchId = scannedValue.substring('PTRI-BATCH:'.length).trim();
      return batchId || null;
    }

    // Existing staff QR may contain the Farmer batch-scan URL.
    try {
      const url = new URL(scannedValue);
      const segments = url.pathname.split('/').filter(Boolean);
      const scanIndex = segments.indexOf('batch-scan');

      if (
        scanIndex > 0 &&
        segments[scanIndex - 1] === 'farmer' &&
        segments[scanIndex + 1]
      ) {
        return decodeURIComponent(segments[scanIndex + 1]);
      }
    } catch {
      // Not a URL. Continue with the manual Batch ID fallback.
    }

    // Manual entry can also accept a plain Firestore Batch ID
    // or a human-readable Batch Number.
    if (!scannedValue.includes(':') && !scannedValue.includes('/')) {
      return scannedValue;
    }

    return null;
  }

  async lookupManualBatch(): Promise<void> {
    if (!this.manualBatchValue.trim()) {
      this.errorMessage = 'Please enter a Batch ID or paste the batch QR value.';
      return;
    }

    await this.processScannedValue(this.manualBatchValue);
  }

  private async processScannedValue(value: string): Promise<void> {
    const batchId = this.extractBatchId(value);

    if (!batchId) {
      this.errorMessage =
        'Invalid QR code. Please scan a valid PTRI Silkworm Batch QR Code.';
      this.successMessage = '';
      this.isProcessing = false;
      this.cdr.detectChanges();
      return;
    }

    await this.loadBatch(batchId);
  }

  async loadBatch(batchId: string): Promise<void> {
    if (!this.farmerUid) {
      this.errorMessage = 'Please log in to view your assigned batch.';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.batch = null;
    this.showBatchModal = false;
    this.isProcessing = true;

    this.cdr.detectChanges();

    try {
      // First, search using the Firestore Document ID.
      let result = await this.requestService.getBatchById(batchId);

      // If not found, search using the human-readable Batch Number.
      if (!result) {
        result = await this.requestService.getBatchByNumber(batchId);
      }

      if (!result) {
        this.errorMessage =
          'No silkworm batch was found. Please check the Batch Number or Batch ID.';
        return;
      }

      // Security check: only the assigned farmer can view this batch.
      if (result.farmerUid !== this.farmerUid) {
        this.errorMessage =
          'Access denied. This silkworm batch is not assigned to your farmer account.';
        return;
      }

      // Display the verified batch information.
      this.batch = result;
      this.successMessage = 'Silkworm batch successfully verified.';
      this.manualBatchValue = result.id;

      // Automatically open the batch information modal.
      this.showBatchModal = true;

    } catch (error) {
      console.error('Failed to retrieve silkworm batch:', error);

      this.errorMessage =
        'Unable to retrieve the batch details. Please check your connection and try again.';

    } finally {
      this.loading = false;
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  // Close the batch information modal.
  closeBatchModal(): void {
    this.showBatchModal = false;
    this.cdr.detectChanges();
  }

  // Reopen the verified batch information modal.
  openBatchModal(): void {
    if (this.batch) {
      this.showBatchModal = true;
      this.cdr.detectChanges();
    }
  }

  resetScanner(): void {
    this.stopCamera();

    this.batch = null;
    this.showBatchModal = false;
    this.manualBatchValue = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.cameraError = '';
    this.isProcessing = false;

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.authUnsubscribe?.();
  }
}
