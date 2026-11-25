
import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  BrowserMultiFormatReader,
  IScannerControls
} from '@zxing/browser';

import {
  CocoonProductionService,
  CocoonReturnRecord,
  CocoonHarvestRecord
} from '../../services/cocoon-production.service';

import {
  SilkwormRequestService,
  SilkwormBatch
} from '../../services/silkworm-request.service';

import {
  FarmerAccountService,
  FarmerAccount
} from '../../services/farmer-account.service';

@Component({
  selector: 'app-cocoon-scan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cocoon-scan.html',
  styleUrl: './cocoon-scan.css'
})
export class CocoonScan implements AfterViewInit, OnDestroy {

  // =====================================
  // PAGE STATE
  // =====================================

  loading = false;
  errorMessage = '';
  successMessage = '';

  // =====================================
  // MANUAL RETURN NUMBER INPUT
  // =====================================

  manualQrValue = '';

  // =====================================
  // CAMERA SCANNER
  // =====================================

  showScanner = false;
  scannerLoading = false;
  scannerError = '';

  private codeReader = new BrowserMultiFormatReader();
  private scannerControls: IScannerControls | null = null;

  private processingScan = false;
  private destroyed = false;
  private viewReady = false;

  @ViewChild('scannerVideo')
  videoElement!: ElementRef<HTMLVideoElement>;

  // =====================================
  // COCOON RETURN DETAILS
  // =====================================

  selectedCollection: CocoonReturnRecord | null = null;
  showDetailsModal = false;

  // Related information loaded from Firestore.
  detailsLoading = false;

  selectedHarvest: CocoonHarvestRecord | null = null;
  selectedBatch: SilkwormBatch | null = null;
  selectedFarmer: FarmerAccount | null = null;

  totalReturnedCocoons: number | null = null;
  remainingCocoons: number | null = null;

  private detailsLoadToken = 0;

  constructor(
    private cocoonService: CocoonProductionService,
    private silkwormRequestService: SilkwormRequestService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  // =====================================
  // VIEW INITIALIZATION
  // =====================================

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  // =====================================
  // OPEN VERIFIED RETURN DETAILS
  // =====================================

  private async openCollectionDetails(
    record: CocoonReturnRecord
  ): Promise<void> {

    this.detailsLoadToken++;
    const currentToken = this.detailsLoadToken;

    this.selectedCollection = record;

    this.selectedHarvest = null;
    this.selectedBatch = null;
    this.selectedFarmer = null;

    this.totalReturnedCocoons = null;
    this.remainingCocoons = null;

    this.detailsLoading = true;
    this.showDetailsModal = true;

    this.cdr.detectChanges();

    try {

      const [
        harvest,
        batch,
        farmers,
        returnRecords
      ] = await Promise.all([

        this.cocoonService
          .getHarvestRecordById(record.harvestId)
          .catch(error => {
            console.error('Unable to load harvest details:', error);
            return null;
          }),

        this.silkwormRequestService
          .getBatchById(record.batchId)
          .catch(error => {
            console.error('Unable to load silkworm batch:', error);
            return null;
          }),

        this.farmerAccountService
          .getFarmers()
          .catch(error => {
            console.error('Unable to load farmer accounts:', error);
            return [];
          }),

        this.cocoonService
          .getAllReturnRecordsForStaff()
          .catch(error => {
            console.error('Unable to load cocoon return records:', error);
            return [];
          })

      ]);

      // Ignore outdated results if another record was opened.
      if (
        this.destroyed ||
        currentToken !== this.detailsLoadToken
      ) {
        return;
      }

      this.selectedHarvest = harvest;
      this.selectedBatch = batch;

      // farmerUid is the Firebase Authentication UID.
      // Match it against FarmerAccount.authUid, not FarmerAccount.id.
      this.selectedFarmer = farmers.find(
        farmer => farmer.authUid === record.farmerUid
      ) ?? null;

      // Calculate total cocoon pieces returned for this harvest.
      const relatedReturns = returnRecords.filter(
        item => item.harvestId === record.harvestId
      );

      this.totalReturnedCocoons = relatedReturns.reduce(
        (total, item) => total + (Number(item.cocoonQuantity) || 0),
        0
      );

      // Calculate remaining pieces using the recorded harvest quantity.
      if (
        harvest &&
        Number.isFinite(Number(harvest.cocoonQuantity))
      ) {
        this.remainingCocoons = Math.max(
          0,
          Number(harvest.cocoonQuantity) - this.totalReturnedCocoons
        );
      }

    } catch (error) {

      console.error('Unable to load cocoon return details:', error);

    } finally {

      if (
        !this.destroyed &&
        currentToken === this.detailsLoadToken
      ) {
        this.detailsLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  // =====================================
  // MANUAL COCOON RETURN NUMBER LOOKUP
  // =====================================

  async findManualCollection(): Promise<void> {

    const returnNumber = this.manualQrValue.trim().toUpperCase();

    if (!returnNumber) {
      this.errorMessage = 'Please enter a cocoon return number first.';
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

      const record =
        await this.cocoonService.getReturnRecordByNumber(returnNumber);

      if (this.destroyed) return;

      if (!record) {
        throw new Error(
          'No cocoon return record found with this return number.'
        );
      }

      await this.openCollectionDetails(record);

      this.successMessage =
        'Cocoon return record successfully found.';

    } catch (error) {

      console.error('Cocoon return number lookup failed:', error);

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
  // START SCANNER
  // =====================================

  async startScanner(): Promise<void> {

    if (
      this.scannerLoading ||
      this.loading ||
      this.destroyed ||
      !this.viewReady
    ) {
      return;
    }

    this.stopScanner(false, false);

    this.showScanner = true;
    this.scannerLoading = true;
    this.scannerError = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.processingScan = false;

    this.cdr.detectChanges();

    // Wait for Angular to render the scanner video element.
    await new Promise(resolve => setTimeout(resolve, 200));

    if (this.destroyed) return;

    await this.startCamera();
  }

  // =====================================
  // START CAMERA
  // =====================================

  private async startCamera(): Promise<void> {

    if (
      this.destroyed ||
      this.processingScan ||
      !this.viewReady ||
      !this.videoElement?.nativeElement
    ) {
      return;
    }

    this.scannerLoading = true;
    this.scannerError = '';
    this.processingScan = false;

    this.cdr.detectChanges();

    try {

      this.scannerControls =
        await this.codeReader.decodeFromVideoDevice(
          undefined,
          this.videoElement.nativeElement,
          (result) => {

            if (result && !this.processingScan && !this.destroyed) {

              this.processingScan = true;

              const scannedValue = result.getText();

              this.cdr.detectChanges();

              // Stop camera before processing the scanned QR.
              void this.stopScanner();

              // Verify the original Cocoon Return QR.
              void this.findScannedCollection(scannedValue);
            }
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

      console.error('Cocoon camera startup error:', error);

      this.stopScanner(false, false);

      this.scannerLoading = false;
      this.showScanner = true;

      this.scannerError =
        error instanceof Error
          ? error.message
          : 'Unable to start the camera. Please check camera permissions.';

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

    const video = this.videoElement?.nativeElement;

    if (video?.srcObject instanceof MediaStream) {
      video.srcObject
        .getTracks()
        .forEach(track => track.stop());

      video.srcObject = null;
    }

    this.scannerLoading = false;

    if (hideModal) {
      this.showScanner = false;
      this.scannerError = '';
      this.processingScan = false;
    }

    if (detectChanges && !this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // VERIFY ORIGINAL COCOON RETURN QR
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

      // Preserve the original Cocoon Return QR lookup.
      // Do not replace this with Silkworm Batch ID lookup.
      const record =
        await this.cocoonService.getReturnRecordByQr(qrValue.trim());

      if (this.destroyed) return;

      if (!record) {
        throw new Error(
          'No matching cocoon return record was found. Please verify the farmer QR code.'
        );
      }

      await this.openCollectionDetails(record);

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

    this.detailsLoadToken++;

    this.showDetailsModal = false;
    this.selectedCollection = null;

    this.selectedHarvest = null;
    this.selectedBatch = null;
    this.selectedFarmer = null;

    this.totalReturnedCocoons = null;
    this.remainingCocoons = null;
    this.detailsLoading = false;

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

  formatWeight(weight: number | null | undefined): string {

    if (weight === null || weight === undefined) {
      return 'Not recorded';
    }

    const parsedWeight = Number(weight);

    if (!Number.isFinite(parsedWeight)) {
      return 'Not recorded';
    }

    return `${parsedWeight.toFixed(2)} kg`;
  }

  formatQuantity(quantity: number | null | undefined): string {

    if (quantity === null || quantity === undefined) {
      return 'Not recorded';
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity)) {
      return 'Not recorded';
    }

    return `${parsedQuantity.toLocaleString('en-PH')} pcs`;
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
    this.detailsLoadToken++;

    this.stopScanner(false, false);
  }
}
