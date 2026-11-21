import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
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
    private cocoonService: CocoonProductionService
  ) {}

  ngOnInit(): void {
    this.loadCollections();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  // =====================================
  // LOAD FARMER COCOON RETURNS
  // =====================================

  async loadCollections(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

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

    try {

      // Allow Angular to render the video element.
      await new Promise(resolve => setTimeout(resolve, 200));

      const video = this.scannerVideo?.nativeElement;

      if (!video) {
        throw new Error(
          'Scanner camera element could not be found. Please try again.'
        );
      }

      this.scannerControls =
        await this.scanner.decodeFromVideoDevice(
          undefined,
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

            // Stop the camera after detecting a QR code.
            this.stopScanner();

            // Find the actual cocoon return record.
            await this.findScannedCollection(scannedValue);
          }
        );

      this.scannerLoading = false;

    } catch (error) {

      console.error('QR scanner failed:', error);

      this.stopScanner(false);

      this.scannerLoading = false;
      this.showScanner = true;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to access the camera. Please check your camera permission.';

    }
  }

  // =====================================
  // STOP QR CAMERA
  // =====================================

  stopScanner(hidePanel = true): void {

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

    if (hidePanel) {
      this.showScanner = false;
      this.scannerError = '';
    }
  }

  // =====================================
  // FIND RECORD USING SCANNED QR
  // =====================================

  async findScannedCollection(qrValue: string): Promise<void> {

    this.errorMessage = '';

    try {

      if (!qrValue?.trim()) {
        throw new Error('The scanned QR code is empty.');
      }

      // The service extracts the original token,
      // hashes it, and searches the actual Firestore record.
      const record =
        await this.cocoonService.getReturnRecordByQr(qrValue.trim());

      if (!record) {
        this.errorMessage =
          'No matching cocoon return record was found. Please check the QR code.';
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

    } catch (error) {

      console.error('QR lookup failed:', error);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to find the scanned cocoon return record.';

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
      (total, item) =>
        total + (Number(item.actualReceivedWeight) || 0),
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
  }

  // =====================================
  // CLOSE DETAILS MODAL
  // =====================================

  closeViewModal(): void {

    // Always stop camera when closing the modal.
    this.stopScanner();

    this.showViewModal = false;
    this.selectedCollection = null;
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
