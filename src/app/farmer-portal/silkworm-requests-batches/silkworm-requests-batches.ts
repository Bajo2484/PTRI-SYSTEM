
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { doc, getDoc } from 'firebase/firestore';
import * as QRCode from 'qrcode';

import { auth, db } from '../../services/firebase';
import {
  SilkwormRequest,
  SilkwormBatch,
  SilkwormRequestService
} from '../../services/silkworm-request.service';

@Component({
  selector: 'app-silkworm-requests-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silkworm-requests-batches.html',
  styleUrl: './silkworm-requests-batches.css'
})
export class SilkwormRequestsBatches implements OnInit {

  // =====================================
  // FARMER INFORMATION
  // =====================================

  farmerUid = '';
  farmerName = '';

  // =====================================
  // PAGE STATE
  // =====================================

  loading = false;
  submitting = false;
  errorMessage = '';

  requests: SilkwormRequest[] = [];
  batches: SilkwormBatch[] = [];

  // =====================================
  // SUMMARY COUNTS
  // =====================================

  get totalRequests(): number {
    return this.requests.length;
  }

  get assignedBatches(): number {
    return this.batches.length;
  }

  get inRearing(): number {
    // Supports existing Firestore records if this status
    // is already being managed by the rearing workflow.
    return this.batches.filter(
      batch => (batch.status as string) === 'In Rearing'
    ).length;
  }

  // =====================================
  // NEW REQUEST MODAL
  // =====================================

  showRequestModal = false;

  openRequestModal(): void {
    this.showRequestModal = true;
  }

  closeRequestModal(): void {
    if (this.submitting) return;
    this.showRequestModal = false;
  }

  // =====================================
  // VIEW REQUEST MODAL
  // =====================================

  showViewRequestModal = false;
  selectedRequest: SilkwormRequest | null = null;

  viewRequest(request: SilkwormRequest): void {
    this.selectedRequest = request;
    this.showViewRequestModal = true;
  }

  closeViewRequestModal(): void {
    this.showViewRequestModal = false;
    this.selectedRequest = null;
  }

  // =====================================
  // VIEW ASSIGNED WORMS MODAL
  // =====================================

  showAssignedWormsModal = false;
  selectedBatch: SilkwormBatch | null = null;
  selectedBatches: SilkwormBatch[] = [];

  qrCodeDataUrl = '';
  isGeneratingQr = false;

  async viewAssignedWorms(
    request: SilkwormRequest
  ): Promise<void> {
    const assignedBatches = this.getAssignedBatches(request);

    if (assignedBatches.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No Assigned Silkworms Yet',
        text: 'PTRI has not assigned a silkworm batch to this request yet.',
        confirmButtonColor: '#39734d'
      });
      return;
    }

    this.selectedRequest = request;
    this.selectedBatches = assignedBatches;
    this.selectedBatch = assignedBatches[0];

    this.showAssignedWormsModal = true;
    this.qrCodeDataUrl = '';

    await this.generateBatchQr(this.selectedBatch);
    this.cdr.detectChanges();
  }

  closeAssignedWormsModal(): void {
    this.showAssignedWormsModal = false;
    this.selectedBatch = null;
    this.selectedBatches = [];
    this.qrCodeDataUrl = '';
  }

  // =====================================
  // REQUEST AND BATCH CONNECTION
  // =====================================

  getAssignedBatches(
    request: SilkwormRequest
  ): SilkwormBatch[] {
    return this.batches.filter(batch =>
      batch.farmerUid === this.farmerUid &&
      (
        batch.requestId === request.id ||
        (request.linkedBatchIds || []).includes(batch.id)
      )
    );
  }

  getAssignedBatch(
    request: SilkwormRequest
  ): SilkwormBatch | null {
    return this.getAssignedBatches(request)[0] || null;
  }

  isAssigned(request: SilkwormRequest): boolean {
    return this.getAssignedBatches(request).length > 0;
  }

  getBatchCount(request: SilkwormRequest): number {
    return this.getAssignedBatches(request).length;
  }

  // =====================================
  // QR CODE GENERATION
  // =====================================

  async generateBatchQr(batch: SilkwormBatch): Promise<void> {
    this.isGeneratingQr = true;
    this.qrCodeDataUrl = '';

    try {
      this.qrCodeDataUrl = await QRCode.toDataURL(
        batch.qrValue,
        {
          width: 280,
          margin: 4,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#102417',
            light: '#FFFFFF'
          }
        }
      );

    } catch (error) {
      console.error('Batch QR generation error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'QR Code Generation Failed',
        text: 'Unable to generate the batch QR code.'
      });

    } finally {
      this.isGeneratingQr = false;
      this.cdr.detectChanges();
    }
  }

  async downloadBatchQr(): Promise<void> {
    if (!this.qrCodeDataUrl || !this.selectedBatch) return;

    const link = document.createElement('a');

    link.href = this.qrCodeDataUrl;
    link.download = `${this.selectedBatch.batchNumber}-QR.png`;
    link.click();
  }

  // =====================================
  // CONFIRM BATCH RECEIPT
  // =====================================

  async confirmReceipt(): Promise<void> {
    const batch = this.selectedBatch;

    if (!batch || !this.farmerUid) return;

    if (batch.status !== 'Delivered') {
      await Swal.fire({
        icon: 'warning',
        title: 'Batch Not Yet Delivered',
        text: 'You can only confirm receipt after physically receiving your silkworm batch.'
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirm Silkworm Receipt?',
      text: `Have you physically received batch ${batch.batchNumber} from PTRI?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, I Received It',
      cancelButtonText: 'Not Yet',
      confirmButtonColor: '#39734d'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Confirming Receipt',
      text: 'Please wait...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await this.requestService.confirmBatchReceipt(
        batch.id,
        this.farmerUid
      );

      await this.loadFarmerData();

      const updatedBatch = this.batches.find(
        item => item.id === batch.id
      );

      this.selectedBatch = updatedBatch || {
        ...batch,
        status: 'Received'
      };

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Receipt Confirmed!',
        text: 'Your silkworm batch has been marked as received.',
        confirmButtonColor: '#39734d'
      });

    } catch (error) {
      console.error('Confirm receipt error:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Confirm Receipt',
        text: error instanceof Error
          ? error.message
          : 'Please try again.'
      });

    } finally {
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // REQUEST FORM
  // =====================================

  requestForm = {
    livingMulberryHills: 0,
    availableLeafWeightKg: 0,
    farmerRemarks: ''
  };

  constructor(
    private requestService: SilkwormRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.initializeFarmer();
  }

  // =====================================
  // INITIALIZE LOGGED-IN FARMER
  // =====================================

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

      await this.loadFarmerData();

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
  // LOAD FARMER REQUESTS AND ASSIGNED BATCHES
  // =====================================

  async loadFarmerData(): Promise<void> {
    if (!this.farmerUid) return;

    this.errorMessage = '';

    try {
      const [farmerRequests, farmerBatches] = await Promise.all([
        this.requestService.getFarmerRequests(this.farmerUid),
        this.requestService.getFarmerBatches(this.farmerUid)
      ]);

      // Extra client-side filtering for display safety.
      this.requests = farmerRequests.filter(
        request => request.farmerUid === this.farmerUid
      );

      this.batches = farmerBatches.filter(
        batch => batch.farmerUid === this.farmerUid
      );

    } catch (error) {
      console.error('Load farmer production data error:', error);

      this.errorMessage =
        'Unable to load your silkworm requests and assigned batches. Please try again.';

    } finally {
      this.cdr.detectChanges();
    }
  }

  // Keep this method available for existing template bindings.
  async loadRequests(): Promise<void> {
    await this.loadFarmerData();
  }

  // =====================================
  // SUBMIT SILKWORM REQUEST
  // =====================================

  async submitRequest(): Promise<void> {
    if (this.submitting) return;

    const form = this.requestForm;

    if (!this.farmerUid || !this.farmerName) {
      await Swal.fire({
        icon: 'error',
        title: 'Farmer Account Not Ready',
        text: 'Your farmer information could not be verified.'
      });
      return;
    }

    if (
      !Number.isInteger(Number(form.livingMulberryHills)) ||
      Number(form.livingMulberryHills) <= 0
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Mulberry Hills',
        text: 'Please enter a valid number of living mulberry hills.'
      });
      return;
    }

    if (
      !Number.isFinite(Number(form.availableLeafWeightKg)) ||
      Number(form.availableLeafWeightKg) <= 0
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Leaf Weight',
        text: 'Please enter the available mulberry leaf weight in kilograms.'
      });
      return;
    }

    this.submitting = true;

    Swal.fire({
      title: 'Submitting Request',
      text: 'Please wait while we save your request...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await this.requestService.createRequest({
        farmerUid: this.farmerUid,
        farmerName: this.farmerName,
        livingMulberryHills: Number(form.livingMulberryHills),
        availableLeafWeightKg: Number(form.availableLeafWeightKg),
        farmerRemarks: form.farmerRemarks.trim()
      });

      this.requestForm = {
        livingMulberryHills: 0,
        availableLeafWeightKg: 0,
        farmerRemarks: ''
      };

      await this.loadFarmerData();

      this.showRequestModal = false;

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: 'Your silkworm request has been submitted successfully. PTRI will review your farm resources and determine the appropriate tray allocation.',
        confirmButtonColor: '#39734d'
      });

    } catch (error) {
      console.error('Submit request error:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Your request could not be saved. Please try again.'
      });

    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // STATUS HELPERS
  // =====================================

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'status-pending';

      case 'Worms Assigned':
      case 'Assigned':
        return 'status-assigned';

      case 'Delivered':
        return 'status-delivered';

      case 'Received':
        return 'status-received';

      case 'In Rearing':
        return 'status-rearing';

      case 'Under Review':
        return 'status-review';

      case 'Approved':
        return 'status-approved';

      case 'Partially Approved':
        return 'status-partial';

      case 'Rejected':
        return 'status-rejected';

      default:
        return 'status-pending';
    }
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return '—';

    return parsedDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

}
