
import Swal from 'sweetalert2';
import QRCode from 'qrcode';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  SilkwormRequest,
  SilkwormRequestService,
  SilkwormBatch,
  AssignWormsData
} from '../../../services/silkworm-request.service';

import {
  FarmerAccount,
  FarmerAccountService
} from '../../../services/farmer-account.service';

interface FarmerRequestView extends SilkwormRequest {
  farmArea: string;
  registeredMulberryTreeCount: number | null;
  farmerRecordFound: boolean;
  farmName: string;
  communityName: string;
}

@Component({
  selector: 'app-silkworm-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silkworm-batches.html',
  styleUrl: './silkworm-batches.css',
})
export class SilkwormBatches implements OnInit {

  constructor(
    private silkwormRequestService: SilkwormRequestService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  pageTitle = 'Silkworm Batches';

  pageDescription =
    'Review farmer silkworm requests and assign prepared silkworm batches.';

  requests: FarmerRequestView[] = [];
  farmers: FarmerAccount[] = [];
  batches: SilkwormBatch[] = [];

  isLoading = false;
  isAssigning = false;
  isGeneratingQr = false;
  errorMessage = '';

  searchTerm = '';
  selectedStatus = 'All Requests';

  showViewModal = false;
  showAssignModal = false;

  selectedRequest: FarmerRequestView | null = null;
  selectedBatch: SilkwormBatch | null = null;

  qrCodeDataUrl = '';

  // This route must be registered in the Angular routing configuration.
  private readonly batchScanRoute = '/farmer/batch-scan';

  assignForm: AssignWormsData = this.createEmptyAssignForm();

  ngOnInit(): void {
    void this.loadData();
  }

  private createEmptyAssignForm(): AssignWormsData {
    return {
      silkwormType: '',
      breed: '',
      trays: 0,
      quantity: 0,
      preparationDate: '',
      deliveryDate: '',
      ptriRemarks: '',
      farmArea: '',
      registeredMulberryTreeCount: 0
    };
  }

  // =====================================
  // LOAD REQUESTS, FARMER RECORDS AND BATCHES
  // =====================================

  async loadData(showLoading = true): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    if (showLoading) {
      Swal.fire({
        title: 'Loading Silkworm Requests',
        text: 'Please wait while we retrieve farmer requests and batch records...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        background: '#fffdf8',
        color: '#493a2c',
        didOpen: () => Swal.showLoading()
      });
    }

    try {
      const [requests, farmers, batches] = await Promise.all([
        this.silkwormRequestService.getAllRequests(),
        this.farmerAccountService.getFarmers(),
        this.silkwormRequestService.getAllBatches()
      ]);

      this.farmers = farmers;
      this.batches = batches;

      this.requests = requests.map(request => {
        const farmer = farmers.find(
          item => item.authUid === request.farmerUid
        );

        return {
          ...request,
          farmArea: farmer?.farmArea || '',
          registeredMulberryTreeCount:
            farmer ? Number(farmer.mulberryTreeCount || 0) : null,
          farmerRecordFound: !!farmer,
          farmName: farmer?.farmName || '',
          communityName: farmer?.communityName || ''
        };
      });

    } catch (error) {
      console.error('Error loading silkworm data:', error);

      this.errorMessage =
        'Unable to load farmer requests and batch records. Please check your connection and Firebase permissions.';

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Data',
        text: this.errorMessage,
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } finally {
      this.isLoading = false;

      if (showLoading) {
        Swal.close();
      }

      this.cdr.detectChanges();
    }
  }

  // =====================================
  // FILTER FARMER REQUEST CARDS
  // =====================================

  get filteredRequests(): FarmerRequestView[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.requests.filter(request => {
      const matchesSearch =
        !search ||
        (request.farmerName || '').toLowerCase().includes(search) ||
        (request.requestNumber || '').toLowerCase().includes(search) ||
        (request.farmName || '').toLowerCase().includes(search) ||
        (request.communityName || '').toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'All Requests' ||
        request.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  get pendingRequests(): number {
    return this.requests.filter(
      request => request.status === 'Pending'
    ).length;
  }

  get assignedRequests(): number {
    return this.requests.filter(
      request => request.status === 'Worms Assigned'
    ).length;
  }

  get totalBatches(): number {
    return this.batches.length;
  }

  get farmersServed(): number {
    return new Set(
      this.batches.map(batch => batch.farmerUid)
    ).size;
  }

  get totalTraysGiven(): number {
    return this.batches.reduce(
      (total, batch) => total + Number(batch.trays || 0),
      0
    );
  }

  getFarmDisplayName(request: FarmerRequestView): string {
    return request.farmName ||
      request.communityName ||
      'Farm name not provided';
  }

  getRequestBatch(request: FarmerRequestView): SilkwormBatch | undefined {
    const batchId = request.linkedBatchIds?.[0];

    if (!batchId) return undefined;

    return this.batches.find(batch => batch.id === batchId);
  }

  isAssigned(request: FarmerRequestView): boolean {
    return request.status === 'Worms Assigned' ||
      !!this.getRequestBatch(request);
  }

  canAssign(request: FarmerRequestView): boolean {
    return request.farmerRecordFound &&
      !!this.farmers.find(
        farmer => farmer.authUid === request.farmerUid
      ) &&
      !this.isAssigned(request) &&
      request.status !== 'Rejected';
  }

  // =====================================
  // VIEW REQUEST AND ASSIGNED BATCH DETAILS
  // =====================================

  async openViewModal(request: FarmerRequestView): Promise<void> {
    this.selectedRequest = request;
    this.selectedBatch = this.getRequestBatch(request) || null;
    this.qrCodeDataUrl = '';

    this.showViewModal = true;
    this.cdr.detectChanges();

    if (this.selectedBatch) {
      await this.loadBatchQrCode(this.selectedBatch);
    }
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedRequest = null;
    this.selectedBatch = null;
    this.qrCodeDataUrl = '';
  }

  // =====================================
  // OPEN ASSIGN WORMS MODAL
  // =====================================

  async openAssignModal(request: FarmerRequestView): Promise<void> {
    if (this.isAssigning) return;

    if (this.isAssigned(request)) {
      await Swal.fire({
        icon: 'info',
        title: 'Worms Already Assigned',
        text: 'This farmer request already has an assigned batch.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    if (!this.canAssign(request)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Farmer Record Unavailable',
        text: 'A matching Farmer Record with a valid account link is required before assigning worms.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    this.selectedRequest = request;

    this.assignForm = {
      ...this.createEmptyAssignForm(),
      farmArea: request.farmArea,
      registeredMulberryTreeCount:
        request.registeredMulberryTreeCount ?? 0
    };

    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    if (this.isAssigning) return;

    this.showAssignModal = false;
    this.selectedRequest = null;
    this.assignForm = this.createEmptyAssignForm();
  }

  // =====================================
  // ASSIGN WORMS AND SAVE ACTUAL BATCH
  // =====================================

  async assignWorms(): Promise<void> {
    const request = this.selectedRequest;

    if (!request || this.isAssigning) return;

    const form = this.assignForm;

    if (
      !form.silkwormType.trim() ||
      !form.breed.trim() ||
      !form.preparationDate ||
      !form.deliveryDate
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Incomplete Assignment Details',
        text: 'Please complete the silkworm type, breed, preparation date, and delivery date.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    if (
      !Number.isInteger(Number(form.trays)) ||
      Number(form.trays) <= 0 ||
      !Number.isInteger(Number(form.quantity)) ||
      Number(form.quantity) <= 0
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Enter a positive whole number for both trays and silkworm quantity.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    if (form.deliveryDate < form.preparationDate) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Delivery Date',
        text: 'The delivery date cannot be earlier than the preparation date.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Assign Silkworm Batch?',
      html: `You are assigning <strong>${Number(form.trays)} tray(s)</strong> to <strong>${request.farmerName}</strong>.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Assign & Save',
      cancelButtonText: 'Go Back',
      confirmButtonColor: '#245638',
      cancelButtonColor: '#795033',
      background: '#fffdf8',
      color: '#493a2c',
      reverseButtons: true
    });

    if (!confirmation.isConfirmed) return;

    this.isAssigning = true;

    Swal.fire({
      title: 'Saving Silkworm Batch',
      text: 'Please wait while we create the batch record...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      const savedBatch = await this.silkwormRequestService.assignWorms(
        request,
        {
          ...form,
          trays: Number(form.trays),
          quantity: Number(form.quantity),
          registeredMulberryTreeCount:
            Number(form.registeredMulberryTreeCount || 0)
        }
      );

      this.showAssignModal = false;
      this.showViewModal = false;
      this.selectedRequest = null;
      this.selectedBatch = null;
      this.assignForm = this.createEmptyAssignForm();

      await this.loadData(false);

      await Swal.fire({
        icon: 'success',
        title: 'Silkworm Batch Assigned!',
        html: `
          <p>The batch for <strong>${savedBatch.farmerName}</strong> has been saved successfully.</p>
          <p><strong>Batch ID:</strong> ${savedBatch.batchNumber}</p>
          <p><strong>Status:</strong> Assigned</p>
        `,
        confirmButtonText: 'View Batch & QR Code',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

      // Open the newly assigned batch details and generate its QR.
      const updatedRequest = this.requests.find(
        item => item.id === request.id
      ) || request;

      this.selectedRequest = updatedRequest;
      this.selectedBatch = savedBatch;
      this.showViewModal = true;

      await this.loadBatchQrCode(savedBatch);

      this.cdr.detectChanges();

    } catch (error) {
      console.error('Error assigning silkworm batch:', error);
      Swal.close();

      const message = error instanceof Error
        ? error.message
        : 'The batch could not be saved. Please check your Firebase permissions and try again.';

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Assign Worms',
        text: message,
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } finally {
      this.isAssigning = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // BUILD BATCH SCANNING URL
  // =====================================

  getBatchScanUrl(batch: SilkwormBatch): string {
    const baseUrl = window.location.origin;
    const batchId = encodeURIComponent(batch.id);

    return `${baseUrl}${this.batchScanRoute}/${batchId}`;
  }

  // =====================================
  // GENERATE BATCH QR CODE
  // =====================================

  async generateQrCode(value: string): Promise<string> {
    if (!value) return '';

    try {
      return await QRCode.toDataURL(value, {
        width: 400,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#203d2c',
          light: '#ffffff'
        }
      });

    } catch (error) {
      console.error('Error generating batch QR code:', error);
      return '';
    }
  }

  async loadBatchQrCode(batch: SilkwormBatch): Promise<void> {
    if (!batch?.id) {
      this.qrCodeDataUrl = '';
      return;
    }

    this.isGeneratingQr = true;
    this.qrCodeDataUrl = '';
    this.cdr.detectChanges();

    try {
      const scanUrl = this.getBatchScanUrl(batch);

      this.qrCodeDataUrl = await this.generateQrCode(scanUrl);

    } catch (error) {
      console.error('Unable to load batch QR code:', error);
      this.qrCodeDataUrl = '';

    } finally {
      this.isGeneratingQr = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // DOWNLOAD BATCH QR CODE
  // =====================================

  downloadQrCode(): void {
    if (!this.selectedBatch || !this.qrCodeDataUrl) {
      void Swal.fire({
        icon: 'warning',
        title: 'QR Code Not Available',
        text: 'Please wait until the QR code has been generated.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    const link = document.createElement('a');

    link.href = this.qrCodeDataUrl;
    link.download = `${this.selectedBatch.batchNumber}-QR-Code.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =====================================
  // FILTER CONTROLS
  // =====================================

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'All Requests';
  }
}
