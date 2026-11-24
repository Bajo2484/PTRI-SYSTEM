
import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader } from '@zxing/browser';

import {
  CocoonProductionService,
  CocoonReturnRecord
} from '../../services/cocoon-production.service';

@Component({
  selector: 'app-cocoon-scan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cocoon-scan.html',
  styleUrl: './cocoon-scan.css'
})
export class CocoonScan implements OnDestroy {

  // PAGE STATE
  loading = false;
  errorMessage = '';
  successMessage = '';

  // MANUAL RETURN NUMBER INPUT
  manualQrValue = '';

  // CAMERA SCANNER
  showScanner = false;
  scannerLoading = false;
  scannerError = '';

  cameraDevices: MediaDeviceInfo[] = [];
  selectedCameraIndex = 0;
  activeCameraLabel = '';

  private scanner = new BrowserMultiFormatReader();
  private scannerControls: { stop: () => void } | null = null;
  private processingScan = false;
  private destroyed = false;

  @ViewChild('scannerVideo')
  scannerVideo?: ElementRef<HTMLVideoElement>;

  // COCOON RETURN DETAILS
  selectedCollection: CocoonReturnRecord | null = null;
  showDetailsModal = false;

  constructor(
    private cocoonService: CocoonProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  // =====================================
  // MANUAL COCOON RETURN NUMBER LOOKUP
  // =====================================

  async findManualCollection(): Promise<void> {

    const returnNumber =
      this.manualQrValue.trim().toUpperCase();

    if (!returnNumber) {
      this.errorMessage =
        'Please enter a cocoon return number first.';

      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    if (this.loading || this.destroyed) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();

    try {

      // Search using the actual Cocoon Return Number.
      const record =
        await this.cocoonService.getReturnRecordByNumber(
          returnNumber
        );

      if (this.destroyed) return;

      if (!record) {
        throw new Error(
          'No cocoon return record found with this return number.'
        );
      }

      // Display the same details modal used by camera scanning.
      this.selectedCollection = record;
      this.showDetailsModal = true;

      this.successMessage =
        'Cocoon return record successfully found.';

    } catch (error) {

      console.error(
        'Cocoon return number lookup failed:',
        error
      );

      if (this.destroyed) return;

      this.selectedCollection = null;
      this.showDetailsModal = false;

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to find the cocoon return record.';

    } finally {

      this.loading = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // START CAMERA SCANNER
  // =====================================

  async startScanner(): Promise<void> {

    if (this.scannerLoading || this.loading || this.destroyed) return;

    this.stopScanner(false, false);

    this.showScanner = true;
    this.scannerLoading = true;
    this.scannerError = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.processingScan = false;

    this.cameraDevices = [];
    this.selectedCameraIndex = 0;
    this.activeCameraLabel = '';

    this.cdr.detectChanges();

    try {

      await new Promise(resolve => setTimeout(resolve, 200));

      if (this.destroyed) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported. Please use HTTPS or localhost.'
        );
      }

      // Request camera permission.
      const permissionStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

      permissionStream.getTracks().forEach(track => track.stop());

      if (this.destroyed) return;

      // Get available cameras.
      this.cameraDevices =
        await BrowserMultiFormatReader.listVideoInputDevices();

      if (this.destroyed) return;

      if (this.cameraDevices.length === 0) {
        throw new Error(
          'No camera was detected. Please connect or enable a camera.'
        );
      }

      // Prefer the rear camera if available.
      const rearCameraIndex = this.cameraDevices.findIndex(device =>
        /back|rear|environment/i.test(device.label)
      );

      this.selectedCameraIndex =
        rearCameraIndex >= 0 ? rearCameraIndex : 0;

      const selectedCamera =
        this.cameraDevices[this.selectedCameraIndex];

      this.activeCameraLabel =
        selectedCamera.label ||
        `Camera ${this.selectedCameraIndex + 1}`;

      await this.startCamera(selectedCamera.deviceId);

    } catch (error) {

      console.error('Cocoon QR scanner error:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;
      this.showScanner = true;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to access the camera. Please check camera permissions.';

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // START SELECTED CAMERA
  // =====================================

  private async startCamera(deviceId: string): Promise<void> {

    if (this.destroyed) return;

    this.scannerLoading = true;
    this.scannerError = '';
    this.processingScan = false;

    this.cdr.detectChanges();

    try {

      const video = this.scannerVideo?.nativeElement;

      if (!video) {
        throw new Error(
          'Camera preview could not be found. Please try again.'
        );
      }

      this.scannerControls =
        await this.scanner.decodeFromVideoDevice(
          deviceId,
          video,
          async result => {

            if (
              !result ||
              this.processingScan ||
              this.destroyed
            ) {
              return;
            }

            const scannedValue = result.getText().trim();

            if (!scannedValue) return;

            this.processingScan = true;

            // Stop the camera before processing the QR.
            this.stopScanner();

            // Camera continues using original secure QR verification.
            await this.findScannedCollection(scannedValue);
          }
        );

      if (this.destroyed) {
        this.scannerControls?.stop();
        this.scannerControls = null;
        return;
      }

      this.scannerLoading = false;
      this.cdr.detectChanges();

    } catch (error) {

      console.error('Camera startup error:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to start the selected camera.';

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // SWITCH CAMERA
  // =====================================

  async switchCamera(): Promise<void> {

    if (
      this.cameraDevices.length < 2 ||
      this.scannerLoading ||
      this.destroyed
    ) {
      return;
    }

    this.selectedCameraIndex =
      (this.selectedCameraIndex + 1) %
      this.cameraDevices.length;

    const selectedCamera =
      this.cameraDevices[this.selectedCameraIndex];

    this.activeCameraLabel =
      selectedCamera.label ||
      `Camera ${this.selectedCameraIndex + 1}`;

    this.stopScanner(false, false);

    this.showScanner = true;
    this.scannerLoading = true;
    this.scannerError = '';

    this.cdr.detectChanges();

    try {

      await new Promise(resolve => setTimeout(resolve, 150));

      if (this.destroyed) return;

      await this.startCamera(selectedCamera.deviceId);

    } catch (error) {

      console.error('Camera switching error:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to switch camera.';

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // STOP CAMERA
  // =====================================

  stopScanner(
    hideModal = true,
    detectChanges = true
  ): void {

    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }

    const video = this.scannerVideo?.nativeElement;

    if (video?.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

    this.scannerLoading = false;

    if (hideModal) {
      this.showScanner = false;
      this.scannerError = '';
      this.activeCameraLabel = '';
      this.processingScan = false;
    }

    if (detectChanges && !this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // VERIFY ORIGINAL QR TOKEN
  // USED BY CAMERA SCANNER
  // =====================================

  async findScannedCollection(qrValue: string): Promise<void> {

    if (this.loading || this.destroyed) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();

    try {

      if (!qrValue?.trim()) {
        throw new Error('The QR code value is empty.');
      }

      // Uses the existing SHA-256 token verification.
      const record =
        await this.cocoonService.getReturnRecordByQr(
          qrValue.trim()
        );

      if (this.destroyed) return;

      if (!record) {
        throw new Error(
          'No matching cocoon return record was found. Please verify the farmer QR code.'
        );
      }

      this.selectedCollection = record;
      this.showDetailsModal = true;

      this.successMessage =
        'Cocoon return QR successfully verified.';

    } catch (error) {

      console.error('Cocoon QR verification failed:', error);

      if (this.destroyed) return;

      this.selectedCollection = null;
      this.showDetailsModal = false;

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to verify the cocoon return QR code.';

    } finally {

      this.loading = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // CLOSE DETAILS MODAL
  // =====================================

  closeDetailsModal(): void {

    this.showDetailsModal = false;
    this.selectedCollection = null;

    this.cdr.detectChanges();
  }

  // =====================================
  // SCAN ANOTHER QR
  // =====================================

  scanAnother(): void {

    this.closeDetailsModal();

    this.errorMessage = '';
    this.successMessage = '';
    this.manualQrValue = '';

    void this.startScanner();
  }

  // =====================================
  // FORMAT HELPERS
  // =====================================

  formatDate(date: string | null | undefined): string {

    if (!date) return 'Not recorded';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not recorded';
    }

    return parsedDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatWeight(
    weight: number | null | undefined
  ): string {

    if (weight === null || weight === undefined) {
      return 'Not recorded';
    }

    const parsedWeight = Number(weight);

    if (!Number.isFinite(parsedWeight)) {
      return 'Not recorded';
    }

    return `${parsedWeight.toFixed(2)} kg`;
  }

  getStatusClass(status: string): string {

    switch (status?.toLowerCase()) {

      case 'submitted':
        return 'status-submitted';

      case 'received':
        return 'status-received';

      default:
        return 'status-default';
    }
  }

  // =====================================
  // DESTROY COMPONENT
  // =====================================

  ngOnDestroy(): void {

    this.destroyed = true;
    this.stopScanner(false, false);
  }
}
