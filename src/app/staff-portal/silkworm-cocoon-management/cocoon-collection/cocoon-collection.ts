
import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { BrowserMultiFormatReader } from '@zxing/browser';

import {
  CocoonProductionService,
  CocoonReturnRecord
} from '../../../services/cocoon-production.service';

@Component({
  selector: 'app-cocoon-collection',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './cocoon-collection.html',
  styleUrl: './cocoon-collection.css',
})
export class CocoonCollection implements OnInit, OnDestroy {

  // =====================================
  // PAGE STATE
  // =====================================

  loading = false;
  errorMessage = '';

  // =====================================
  // MODAL CONTROLS
  // =====================================

  showViewModal = false;
  selectedCollection: CocoonReturnRecord | null = null;

  // =====================================
  // QR SCANNER
  // =====================================

  showScanner = false;
  scannerLoading = false;
  scannerError = '';

  cameraDevices: MediaDeviceInfo[] = [];
  selectedCameraIndex = 0;
  activeCameraLabel = '';

  private scanner = new BrowserMultiFormatReader();

  private scannerControls: { stop: () => void } | null = null;
  private processingScan = false;

  @ViewChild('scannerVideo')
  scannerVideo?: ElementRef<HTMLVideoElement>;

  // =====================================
  // SEARCH
  // =====================================

  searchTerm = '';

  // =====================================
  // COCOON RETURN RECORDS
  // =====================================

  collections: CocoonReturnRecord[] = [];

  constructor(
    private cocoonService: CocoonProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCollections();
  }

  ngOnDestroy(): void {
    this.stopScanner(false, false);
  }

  // =====================================
  // LOAD COCOON RETURN RECORDS
  // =====================================

  async loadCollections(): Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    try {

      this.collections =
        await this.cocoonService.getAllReturnRecordsForStaff();

    } catch (error) {

      console.error('Failed to load cocoon returns:', error);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to load cocoon return records. Please try again.';

    } finally {

      this.loading = false;
      this.cdr.detectChanges();

    }
  }

  // =====================================
  // START QR CAMERA SCANNER
  // =====================================

  async startScanner(): Promise<void> {

    // Stop any previous camera session.
    this.stopScanner(false);

    this.showScanner = true;
    this.scannerLoading = true;
    this.scannerError = '';
    this.processingScan = false;

    this.cameraDevices = [];
    this.selectedCameraIndex = 0;
    this.activeCameraLabel = '';

    // Render the scanner modal and video element.
    this.cdr.detectChanges();

    try {

      // Wait for Angular to render the video element.
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check browser camera support.
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported by this browser. Please use a supported browser over HTTPS or localhost.'
        );
      }

      // Request temporary camera permission.
      // This also helps reveal camera labels when enumerating devices.
      const permissionStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

      // Release the temporary permission stream.
      permissionStream.getTracks().forEach(track => track.stop());

      // Get available cameras.
      this.cameraDevices =
  await BrowserMultiFormatReader.listVideoInputDevices();

      if (this.cameraDevices.length === 0) {
        throw new Error(
          'No camera was detected. Please connect or enable a camera and try again.'
        );
      }

      // Prefer the rear camera when available.
      const rearCameraIndex = this.cameraDevices.findIndex(device =>
        /back|rear|environment/i.test(device.label)
      );

      // Use rear camera if found; otherwise use the first available camera.
      this.selectedCameraIndex =
        rearCameraIndex >= 0 ? rearCameraIndex : 0;

      const selectedCamera =
        this.cameraDevices[this.selectedCameraIndex];

      this.activeCameraLabel =
        selectedCamera.label ||
        `Camera ${this.selectedCameraIndex + 1}`;

      // Start the selected camera.
      await this.startCamera(selectedCamera.deviceId);

    } catch (error) {

      console.error('QR scanner failed:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;
      this.showScanner = true;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to access the camera. Please check your camera permission.';

      this.cdr.detectChanges();

    }
  }

  // =====================================
  // START SELECTED CAMERA
  // =====================================

  private async startCamera(deviceId: string): Promise<void> {

    this.scannerLoading = true;
    this.scannerError = '';
    this.processingScan = false;

    this.cdr.detectChanges();

    try {

      const video = this.scannerVideo?.nativeElement;

      if (!video) {
        throw new Error(
          'Scanner camera element could not be found. Please try again.'
        );
      }

      // Start the selected camera and decode QR codes.
      this.scannerControls =
        await this.scanner.decodeFromVideoDevice(
          deviceId,
          video,
          async result => {

            // Prevent duplicate scans.
            if (!result || this.processingScan) {
              return;
            }

            this.processingScan = true;

            const scannedValue = result.getText().trim();

            if (!scannedValue) {
              this.processingScan = false;
              return;
            }

            // Stop the camera and close the scanner modal.
            this.stopScanner();

            // Find the actual cocoon return record.
            await this.findScannedCollection(scannedValue);

          }
        );

      this.scannerLoading = false;
      this.cdr.detectChanges();

    } catch (error) {

      console.error('Camera startup failed:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to start the selected camera. Please try another camera.';

      this.cdr.detectChanges();

    }
  }

  // =====================================
  // SWITCH BETWEEN FRONT AND BACK CAMERA
  // =====================================

  async switchCamera(): Promise<void> {

    // Switching is unavailable if only one camera exists.
    if (this.cameraDevices.length < 2 || this.scannerLoading) {
      return;
    }

    // Select the next available camera.
    this.selectedCameraIndex =
      (this.selectedCameraIndex + 1) % this.cameraDevices.length;

    const selectedCamera =
      this.cameraDevices[this.selectedCameraIndex];

    this.activeCameraLabel =
      selectedCamera.label ||
      `Camera ${this.selectedCameraIndex + 1}`;

    // Stop the current camera without closing the scanner modal.
    this.stopScanner(false, false);

    this.showScanner = true;
    this.scannerError = '';
    this.scannerLoading = true;

    this.cdr.detectChanges();

    try {

      // Give the previous camera stream time to release.
      await new Promise(resolve => setTimeout(resolve, 150));

      // Start the newly selected camera.
      await this.startCamera(selectedCamera.deviceId);

    } catch (error) {

      console.error('Camera switching failed:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;
      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to switch camera. Please try again.';

      this.cdr.detectChanges();

    }
  }

  // =====================================
  // STOP QR CAMERA
  // =====================================

  stopScanner(
    hideModal = true,
    detectChanges = true
  ): void {

    // Stop ZXing camera controls.
    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }

    // Stop all active camera tracks.
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

    if (detectChanges) {
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // FIND RECORD USING SCANNED QR
  // =====================================

  async findScannedCollection(qrValue: string): Promise<void> {

    this.errorMessage = '';
    this.cdr.detectChanges();

    try {

      if (!qrValue?.trim()) {
        throw new Error('The scanned QR code is empty.');
      }

      // Extract and validate the original QR token through the service.
      const record =
        await this.cocoonService.getReturnRecordByQr(qrValue.trim());

      if (!record) {

        this.errorMessage =
          'No matching cocoon return record was found. Please check the QR code.';

        this.cdr.detectChanges();
        return;
      }

      // Update the existing record if already loaded.
      const existingIndex = this.collections.findIndex(
        item => item.id === record.id
      );

      if (existingIndex !== -1) {

        this.collections[existingIndex] = record;

      } else {

        this.collections = [record, ...this.collections];

      }

      // Open the actual matched cocoon return details.
      this.selectedCollection = record;
      this.showViewModal = true;

      this.cdr.detectChanges();

    } catch (error) {

      console.error('QR lookup failed:', error);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to find the scanned cocoon return record.';

      this.cdr.detectChanges();

    }
  }

  // =====================================
  // OVERVIEW CARD VALUES
  // =====================================

  get totalCollections(): number {
    return this.collections.length;
  }
get totalWeightCollected(): number {

  return this.collections.reduce(
    (total, item) => {

      // Count the cocoon weight submitted by the farmer.
      const weight = Number(item.cocoonWeight ?? 0);

      return total + (Number.isFinite(weight) ? weight : 0);

    },
    0
  );
}
  get totalFarmers(): number {

    return new Set(
      this.collections.map(item => item.farmerUid)
    ).size;

  }

  get pendingReturns(): number {

    return this.collections.filter(
      item => item.status === 'Submitted'
    ).length;

  }

  get receivedReturns(): number {

    return this.collections.filter(
      item => item.status === 'Received'
    ).length;

  }

  // =====================================
  // SEARCH FILTER
  // =====================================

  get filteredCollections(): CocoonReturnRecord[] {

    const search = this.searchTerm.toLowerCase().trim();

    if (!search) {
      return this.collections;
    }

    return this.collections.filter(item =>
      (item.farmerName || '').toLowerCase().includes(search) ||
      (item.returnNumber || '').toLowerCase().includes(search) ||
      (item.batchNumber || '').toLowerCase().includes(search) ||
      (item.harvestNumber || '').toLowerCase().includes(search) ||
      (item.requestNumber || '').toLowerCase().includes(search)
    );

  }

  // =====================================
  // VIEW COCOON RETURN DETAILS
  // =====================================

  viewCollection(collection: CocoonReturnRecord): void {

    // Stop any active scanner before opening another record.
    this.stopScanner();

    this.selectedCollection = collection;
    this.showViewModal = true;

    this.cdr.detectChanges();
  }

  // =====================================
  // CLOSE DETAILS MODAL
  // =====================================

  closeViewModal(): void {

    // Always stop camera when closing the modal.
    this.stopScanner();

    this.showViewModal = false;
    this.selectedCollection = null;

    this.cdr.detectChanges();
  }

  // =====================================
  // REFRESH RECORDS
  // =====================================

  async refreshCollections(): Promise<void> {

    await this.loadCollections();

    if (this.selectedCollection) {

      const updatedRecord = this.collections.find(
        item => item.id === this.selectedCollection?.id
      );

      this.selectedCollection = updatedRecord ?? null;

      if (!updatedRecord) {
        this.closeViewModal();
      }

    }

    this.cdr.detectChanges();
  }

  // =====================================
  // STATUS CLASS
  // =====================================

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
  // FORMAT WEIGHT
  // =====================================

  formatWeight(weight: number | null | undefined): string {

    if (weight === null || weight === undefined) {
      return 'Not recorded';
    }

    return `${Number(weight).toFixed(2)} kg`;
  }

}
