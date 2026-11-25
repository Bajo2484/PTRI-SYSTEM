
import QRCode from 'qrcode';

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import {
  CocoonProductionService,
  CocoonHarvestRecord,
  CocoonReturnRecord
} from '../../services/cocoon-production.service';

import { SilkwormBatch } from '../../services/silkworm-request.service';

import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Package,
  Weight,
  Clock,
  PackageOpen,
  CircleCheck,
  Leaf,
  Plus,
  Truck,
  ArrowRight,
  Box,
  QrCode,
  Calendar,
  ChevronRight,
  Hand,
  FileText,
  X,
  Info,
  Check,
  CircleAlert,
  Send,
  Download,
  ShieldCheck,
  ClipboardList
} from 'lucide-angular';

@Component({
  selector: 'app-cocoon-production',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Package,
        PackageOpen,
        Weight,
        Clock,
        CircleCheck,
        Leaf,
        Plus,
        Truck,
        ArrowRight,
        QrCode,
        Calendar,
        ChevronRight,
        Hand,
        FileText,
        X,
        Info,
        Check,
        CircleAlert,
        Send
      })
    }
  ],
  templateUrl: './cocoon-production.html',
  styleUrl: './cocoon-production.css'
})
export class CocoonProduction implements OnInit {

  // =====================================
  // FARMER INFORMATION
  // =====================================

  farmerUid = '';
  farmerName = '';

  loading = false;
  submitting = false;
  errorMessage = '';

  // =====================================
  // COCOON DATA
  // =====================================

  harvestRecords: CocoonHarvestRecord[] = [];
  returnRecords: CocoonReturnRecord[] = [];
  eligibleBatches: SilkwormBatch[] = [];

  selectedRecord: CocoonHarvestRecord | null = null;

  // =====================================
  // TWO-TAB NAVIGATION
  // =====================================

  activeTab: 'harvest' | 'returns' = 'harvest';

  changeTab(tab: 'harvest' | 'returns'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // =====================================
  // MODAL STATES
  // =====================================

  showHarvestModal = false;
  showDetailsModal = false;
  showReturnModal = false;

  // =====================================
  // HARVEST FORM
  // =====================================

  harvestForm = {
    batchId: '',
    harvestDate: this.getToday(),
    harvestedWeight: 0,
    cocoonQuantity: null as number | null,
    cocoonCondition: 'Good',
    remarks: '',
    expectedReturnDate: ''
  };

  // =====================================
  // RETURN FORM
  // =====================================

  returnForm = {
    returnDate: this.getToday(),
    returnedWeight: 0,
    remarks: ''
  };

  constructor(
    private cocoonService: CocoonProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  // =====================================
  // INITIALIZATION
  // =====================================

  async ngOnInit(): Promise<void> {
    await this.initializeFarmer();
  }

  async initializeFarmer(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const user = auth.currentUser;

      if (!user) {
        this.errorMessage =
          'Your session could not be verified. Please sign in again.';
        return;
      }

      this.farmerUid = user.uid;

      const userSnapshot = await getDoc(
        doc(db, 'users', user.uid)
      );

      if (!userSnapshot.exists()) {
        this.errorMessage =
          'Farmer account information was not found.';
        return;
      }

      const userData = userSnapshot.data();

      if (userData['role'] !== 'farmer') {
        this.errorMessage =
          'This page is only available to farmer accounts.';
        return;
      }

      this.farmerName =
        userData['fullName'] ||
        userData['name'] ||
        userData['username'] ||
        'Farmer';

      await this.loadCocoonData();

    } catch (error) {
      console.error('Farmer initialization error:', error);

      this.errorMessage =
        'Unable to load your farmer information. Please try again.';

    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // LOAD COCOON DATA FROM FIRESTORE
  // =====================================

  async loadCocoonData(): Promise<void> {
    if (!this.farmerUid) return;

    try {
      const [
        harvestRecords,
        returnRecords,
        eligibleBatches
      ] = await Promise.all([
        this.cocoonService.getFarmerHarvestRecords(
          this.farmerUid
        ),
        this.cocoonService.getFarmerReturnRecords(
          this.farmerUid
        ),
        this.cocoonService.getEligibleHarvestBatches(
          this.farmerUid
        )
      ]);

      this.harvestRecords = harvestRecords;
      this.returnRecords = returnRecords;
      this.eligibleBatches = eligibleBatches;

      this.cdr.detectChanges();

    } catch (error) {
      console.error('Cocoon data loading error:', error);

      this.errorMessage =
        'Unable to load your cocoon production records. Please refresh the page.';

      this.cdr.detectChanges();
    }
  }

  // =====================================
  // SUMMARY CARDS
  // =====================================

  get totalHarvests(): number {
    return this.harvestRecords.length;
  }

  get totalCocoonWeight(): number {
    return this.harvestRecords.reduce(
      (total, record) =>
        total + Number(record.harvestedWeight || 0),
      0
    );
  }

  get pendingReturns(): number {
    return this.harvestRecords.filter(
      record => record.returnStatus === 'Pending Return'
    ).length;
  }

  get confirmedReturns(): number {
    return this.returnRecords.filter(
      record => record.status === 'Received'
    ).length;
  }

  get totalAssignedBatches(): number {
    return this.eligibleBatches.length;
  }

  // =====================================
  // TAB RECORDS
  // =====================================

  getHarvestRecordsForDisplay(): CocoonHarvestRecord[] {
    return this.harvestRecords;
  }

  getSubmittedReturnRecordsForDisplay(): CocoonReturnRecord[] {
    return this.returnRecords;
  }

  getReturnEligibleRecordsForDisplay(): CocoonHarvestRecord[] {
    return this.harvestRecords.filter(
      record => record.returnStatus === 'Pending Return'
    );
  }

  // =====================================
  // HARVEST MODAL
  // =====================================

  async openHarvestModal(): Promise<void> {
    if (this.submitting) return;

    await this.loadCocoonData();

    if (this.eligibleBatches.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No Available Worm Batch',
        text: 'You need to receive a silkworm batch from PTRI before recording cocoon production.',
        confirmButtonColor: '#39734d'
      });

      return;
    }

    this.harvestForm = {
      batchId: '',
      harvestDate: this.getToday(),
      harvestedWeight: 0,
      cocoonQuantity: null,
      cocoonCondition: 'Good',
      remarks: '',
      expectedReturnDate: ''
    };

    this.showHarvestModal = true;
    this.cdr.detectChanges();
  }

  closeHarvestModal(): void {
    if (this.submitting) return;

    this.showHarvestModal = false;
  }

  // =====================================
  // SUBMIT COCOON HARVEST
  // =====================================

  async submitHarvest(): Promise<void> {
    if (this.submitting) return;

    const form = this.harvestForm;

    if (!form.batchId) {
      await this.showWarning(
        'Select Silkworm Batch',
        'Please select the PTRI-assigned silkworm batch for this harvest.'
      );
      return;
    }

    if (!form.harvestDate) {
      await this.showWarning(
        'Harvest Date Required',
        'Please select the actual cocoon harvest date.'
      );
      return;
    }

    if (form.harvestDate > this.getToday()) {
      await this.showWarning(
        'Invalid Harvest Date',
        'Harvest date cannot be in the future.'
      );
      return;
    }

    if (
      !Number.isFinite(Number(form.harvestedWeight)) ||
      Number(form.harvestedWeight) <= 0
    ) {
      await this.showWarning(
        'Invalid Harvest Weight',
        'Please enter a valid harvested cocoon weight in kilograms.'
      );
      return;
    }

    if (
      form.cocoonQuantity !== null &&
      (
        !Number.isInteger(Number(form.cocoonQuantity)) ||
        Number(form.cocoonQuantity) < 0
      )
    ) {
      await this.showWarning(
        'Invalid Cocoon Quantity',
        'Please enter a valid whole number for the cocoon count.'
      );
      return;
    }

    if (!form.cocoonCondition.trim()) {
      await this.showWarning(
        'Cocoon Condition Required',
        'Please select the condition of the harvested cocoons.'
      );
      return;
    }

    if (
      form.expectedReturnDate &&
      form.expectedReturnDate < form.harvestDate
    ) {
      await this.showWarning(
        'Invalid Expected Return Date',
        'Expected return date cannot be earlier than the harvest date.'
      );
      return;
    }

    this.submitting = true;

    Swal.fire({
      title: 'Recording Cocoon Harvest',
      text: 'Saving your harvest details...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const result = await this.cocoonService.recordHarvest(
        form.batchId,
        this.farmerUid,
        {
          harvestDate: form.harvestDate,
          harvestedWeight: Number(form.harvestedWeight),
          cocoonQuantity:
            form.cocoonQuantity === null
              ? undefined
              : Number(form.cocoonQuantity),
          cocoonCondition: form.cocoonCondition,
          remarks: form.remarks.trim(),
          expectedReturnDate:
            form.expectedReturnDate || undefined
        }
      );

      Swal.close();

      this.showHarvestModal = false;

      await this.loadCocoonData();

      this.activeTab = 'harvest';
      this.cdr.detectChanges();

      await Swal.fire({
        icon: 'success',
        title: 'Harvest Recorded!',
        html: `
          <p>Your cocoon harvest has been recorded successfully.</p>
          <strong>${this.escapeHtml(result.harvestNumber)}</strong>
          <p>Linked Worm Batch: ${this.escapeHtml(result.batchNumber)}</p>
        `,
        confirmButtonColor: '#39734d'
      });

    } catch (error) {
      console.error('Harvest submission error:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Harvest Not Recorded',
        text: error instanceof Error
          ? error.message
          : 'Unable to save your cocoon harvest. Please try again.',
        confirmButtonColor: '#39734d'
      });

    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // VIEW HARVEST DETAILS
  // =====================================

  viewHarvestDetails(record: CocoonHarvestRecord): void {
    this.selectedRecord = record;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRecord = null;
  }

  // =====================================
  // COCOON RETURN MODAL
  // =====================================

  openReturnModal(): void {
    if (this.submitting) return;

    this.selectedRecord = null;

    this.returnForm = {
      returnDate: this.getToday(),
      returnedWeight: 0,
      remarks: ''
    };

    this.showReturnModal = true;
  }

  closeReturnModal(): void {
    if (this.submitting) return;

    this.showReturnModal = false;
    this.selectedRecord = null;
  }

  selectReturnRecord(record: CocoonHarvestRecord): void {
    if (record.returnStatus !== 'Pending Return') return;

    this.selectedRecord = record;

    this.returnForm = {
      returnDate: this.getToday(),
      returnedWeight: record.harvestedWeight,
      remarks: ''
    };
  }

  // =====================================
  // SUBMIT COCOON RETURN
  // DIRECT FIRESTORE TRANSACTION
  // =====================================

  async submitReturn(): Promise<void> {
    if (this.submitting) return;

    if (!this.selectedRecord) {
      await this.showWarning(
        'Select Cocoon Record',
        'Please select a cocoon harvest record first.'
      );
      return;
    }

    if (!this.returnForm.returnDate) {
      await this.showWarning(
        'Return Date Required',
        'Please select the date you returned the cocoons.'
      );
      return;
    }

    if (this.returnForm.returnDate > this.getToday()) {
      await this.showWarning(
        'Invalid Return Date',
        'Return date cannot be in the future.'
      );
      return;
    }

    if (
      this.returnForm.returnDate <
      this.selectedRecord.harvestDate
    ) {
      await this.showWarning(
        'Invalid Return Date',
        'Return date cannot be earlier than the harvest date.'
      );
      return;
    }

    this.submitting = true;

    Swal.fire({
      title: 'Submitting Cocoon Return',
      text: 'Saving your cocoon return information...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const result = await this.cocoonService.submitReturn(
        this.selectedRecord.id,
        this.farmerUid,
        this.returnForm.returnDate
      );

      Swal.close();

      this.showReturnModal = false;
      this.selectedRecord = null;

      await this.loadCocoonData();

      this.activeTab = 'returns';
      this.cdr.detectChanges();

      const successResult = await Swal.fire({
        icon: 'success',
        title: 'Cocoon Return Submitted!',
        html: `
          <p>Your cocoon return record has been created successfully.</p>
          <strong>${this.escapeHtml(result.returnNumber)}</strong>
          <p>Linked Worm Batch: ${this.escapeHtml(result.batchNumber)}</p>
          <p>Your return is now waiting for PTRI receiving and verification.</p>
          <p><strong>Your QR Code is ready!</strong></p>
        `,
        confirmButtonText: 'View QR Code',
        confirmButtonColor: '#39734d'
      });

      if (successResult.isConfirmed) {
        await this.viewReturnDetails(result);
      }

    } catch (error) {
      console.error('Cocoon return submission error:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Return Not Submitted',
        text: error instanceof Error
          ? error.message
          : 'Unable to submit your cocoon return. Please try again.',
        confirmButtonColor: '#39734d'
      });

    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // VIEW COCOON RETURN DETAILS AND QR
  // QR VALUE IS REGENERATED FROM SAVED RECORD ID
  // =====================================

  async viewReturnDetails(record: CocoonReturnRecord): Promise<void> {
    try {
      const savedRecord = await this.cocoonService.getReturnRecordById(
        record.id,
        this.farmerUid
      );

      if (!savedRecord) {
        await Swal.fire({
          icon: 'warning',
          title: 'Return Record Not Found',
          text: 'The cocoon return record could not be loaded.',
          confirmButtonColor: '#39794d'
        });

        return;
      }

      // Always use the QR value from the freshly loaded Firestore record.
      const qrValue = savedRecord.qrValue;

      if (!qrValue) {
        await Swal.fire({
          icon: 'error',
          title: 'QR Code Generation Failed',
          text: 'The permanent QR value could not be generated. Please try again.',
          confirmButtonColor: '#39794d'
        });

        return;
      }

      const qrCodeUrl = await QRCode.toDataURL(qrValue, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#183d2b',
          light: '#ffffff'
        }
      });

      await Swal.fire({
        width: 680,
        padding: 0,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'cocoon-return-details-popup'
        },
        html: `
          <div class="return-details-modal">
            <div class="return-details-header">
              <div class="return-details-icon">
                <i class="fas fa-box-open"></i>
              </div>
              <div>
                <span class="return-details-eyebrow">COCOON PRODUCTION</span>
                <h2>Cocoon Return Details</h2>
                <p>Your submitted cocoon return record and QR code</p>
              </div>
            </div>

            <div class="return-details-body">
              <div class="return-qr-card">
                <span class="return-qr-label">RETURN VERIFICATION QR</span>

                <div class="return-qr-image">
                  <img src="${qrCodeUrl}" alt="Cocoon Return QR Code">
                </div>

                <h3>${this.escapeHtml(savedRecord.returnNumber || 'Return Record')}</h3>

                <p>
                  Present this QR code to PTRI staff when returning your cocoons.
                </p>

                <span class="return-qr-status">
                  <i class="fas fa-check-circle"></i>
                  QR Code Generated
                </span>
              </div>

              <div class="return-info-card">
                <div class="return-info-heading">
                  <i class="fas fa-clipboard-list"></i>
                  Return Information
                </div>

                <div class="return-info-row">
                  <span>Return Number</span>
                  <strong>${this.escapeHtml(savedRecord.returnNumber || '—')}</strong>
                </div>

                <div class="return-info-row">
                  <span>Worm Batch ID</span>
                  <strong>${this.escapeHtml(savedRecord.batchNumber || '—')}</strong>
                </div>

                <div class="return-info-row">
                  <span>Harvest Record</span>
                  <strong>${this.escapeHtml(savedRecord.harvestNumber || '—')}</strong>
                </div>

                <div class="return-info-row">
                  <span>Harvest Date</span>
                  <strong>${this.formatDate(savedRecord.harvestDate)}</strong>
                </div>

                <div class="return-info-row">
                  <span>Return Date</span>
                  <strong>${this.formatDate(savedRecord.returnDate)}</strong>
                </div>

                <div class="return-info-row">
                  <span>Cocoon Weight</span>
                  <strong>${this.formatWeight(savedRecord.cocoonWeight)}</strong>
                </div>

                <div class="return-info-row">
                  <span>Cocoon Quantity</span>
                  <strong>${savedRecord.cocoonQuantity ?? '—'}</strong>
                </div>

                <div class="return-info-row">
                  <span>Condition</span>
                  <strong>${this.escapeHtml(savedRecord.cocoonCondition || '—')}</strong>
                </div>

                <div class="return-info-row">
                  <span>Status</span>
                  <strong class="return-status-text">
                    ${this.escapeHtml(savedRecord.status || 'Submitted')}
                  </strong>
                </div>

                ${savedRecord.farmerRemarks ? `
                  <div class="return-remarks">
                    <span>Farmer Remarks</span>
                    <p>${this.escapeHtml(savedRecord.farmerRemarks)}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="return-details-footer">
              <span>
                <i class="fas fa-shield-alt"></i>
                Keep this QR code for PTRI verification.
              </span>

              <button type="button" id="downloadReturnQR">
                <i class="fas fa-download"></i>
                Download QR Code
              </button>
            </div>
          </div>
        `,
        didOpen: () => {
          const downloadButton =
            Swal.getPopup()?.querySelector<HTMLButtonElement>(
              '#downloadReturnQR'
            );

          downloadButton?.addEventListener('click', () => {
            const link = document.createElement('a');

            link.href = qrCodeUrl;
            link.download =
              `${savedRecord.returnNumber || 'cocoon-return'}-QR.png`;

            document.body.appendChild(link);
            link.click();
            link.remove();
          });
        }
      });

    } catch (error) {
      console.error('Error displaying cocoon return details:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Details',
        text: error instanceof Error
          ? error.message
          : 'Something went wrong while loading your return details.',
        confirmButtonColor: '#39794d'
      });
    }
  }

  // =====================================
  // STATUS STYLING
  // =====================================

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending Return':
        return 'status-pending';

      case 'Submitted':
        return 'status-submitted';

      case 'Received':
        return 'status-received';

      case 'Verified':
        return 'status-verified';

      default:
        return 'status-pending';
    }
  }

  // =====================================
  // FORMAT HELPERS
  // =====================================

  formatDate(date: string | undefined | null): string {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatWeight(weight: number): string {
    return `${Number(weight || 0).toFixed(2)} kg`;
  }

  private getToday(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private escapeHtml(value: string): string {
    return String(value || '').replace(/[&<>"']/g, char => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };

      return entities[char];
    });
  }

  private async showWarning(
    title: string,
    text: string
  ): Promise<void> {
    await Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#39734d'
    });
  }
}
