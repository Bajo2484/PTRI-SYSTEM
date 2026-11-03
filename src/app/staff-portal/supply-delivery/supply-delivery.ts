
import Swal from 'sweetalert2';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { SilkOrderService, type SilkOrder, type OrderStatus, type OrderStatusHistory } from '../../services/silk-order.service';

@Component({
  selector: 'app-supply-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supply-delivery.html',
  styleUrl: './supply-delivery.css',
})
export class SupplyDelivery implements OnInit, OnDestroy {
  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;

  shipments: SilkOrder[] = [];
  selectedShipment: SilkOrder | null = null;
  scannedShipment: SilkOrder | null = null;

  showShipmentDetails = false;
  showScannerModal = false;
  showReceivingForm = false;

  activeShipmentTab: 'overview' | 'progress' | 'receiving' = 'overview';
  searchTerm = '';
  selectedStatusFilter: 'All' | 'Preparing' | 'In Transit' | 'Delivered' = 'All';

  manualTrackingId = '';
  scannerError = '';
  isScannerActive = false;
  private scannerControls: { stop: () => void | Promise<void> } | null = null;

  isLoading = false;
  loadError = '';

  receiverName = '';
  actualQuantityReceived: number | null = null;
  packageCondition: 'Good' | 'Damaged' | 'Incomplete' = 'Good';
  receivingRemarks = '';
  isConfirmingDelivery = false;

  readonly shipmentStatuses: OrderStatus[] = ['Order Confirmed', 'Preparing Order', 'Packing Completed', 'Ready for Dispatch', 'Dispatched', 'In Transit', 'Delivered'];
  readonly shipmentSteps: OrderStatus[] = ['Order Confirmed', 'Preparing Order', 'Packing Completed', 'Ready for Dispatch', 'Dispatched', 'In Transit', 'Delivered'];

  constructor(private silkOrderService: SilkOrderService, private cdr: ChangeDetectorRef) {}

  async ngOnInit(): Promise<void> { await this.loadShipments(); }
  ngOnDestroy(): void { this.stopScanner(); }

  // LOAD SHIPMENTS
  async loadShipments(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    try {
      const orders = await this.silkOrderService.getAllOrders();
      this.shipments = orders.filter(order => this.shipmentStatuses.includes(order.status));
    } catch (error) {
      console.error('Error loading shipments:', error);
      this.loadError = 'Unable to load shipment records. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // SEARCH AND FILTER
  get filteredShipments(): SilkOrder[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.shipments.filter(order => {
      const matchesSearch = !search || [order.orderId, order.partnerName, order.trackingId, order.silkType, order.location]
        .some(value => value?.toLowerCase().includes(search));

      const preparingStatuses: OrderStatus[] = ['Order Confirmed', 'Preparing Order', 'Packing Completed'];
      const transitStatuses: OrderStatus[] = ['Ready for Dispatch', 'Dispatched', 'In Transit'];

      const matchesStatus = this.selectedStatusFilter === 'All' ||
        (this.selectedStatusFilter === 'Preparing' && preparingStatuses.includes(order.status)) ||
        (this.selectedStatusFilter === 'In Transit' && transitStatuses.includes(order.status)) ||
        order.status === this.selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  // SUMMARY COUNTS
  get totalShipments(): number { return this.shipments.length; }

  get preparingCount(): number {
    return this.shipments.filter(order => ['Preparing Order', 'Packing Completed'].includes(order.status)).length;
  }

  get inTransitCount(): number {
    return this.shipments.filter(order => ['Dispatched', 'In Transit'].includes(order.status)).length;
  }

  get deliveredCount(): number {
    return this.shipments.filter(order => order.status === 'Delivered').length;
  }

  // SHIPMENT TIMELINE
  get currentStepIndex(): number {
    return this.selectedShipment ? this.shipmentSteps.indexOf(this.selectedShipment.status) : -1;
  }

  isStepCompleted(status: OrderStatus): boolean {
    const stepIndex = this.shipmentSteps.indexOf(status);
    return stepIndex !== -1 && stepIndex < this.currentStepIndex;
  }

  isCurrentStep(status: OrderStatus): boolean {
    return this.selectedShipment?.status === status;
  }

  getStepDate(status: OrderStatus): string | null {
    const history = this.selectedShipment?.statusHistory || [];
    return history.find(item => item.status === status)?.updatedAt || null;
  }

  get nextShipmentStatus(): OrderStatus | null {
    if (!this.selectedShipment) return null;
    const currentIndex = this.shipmentSteps.indexOf(this.selectedShipment.status);
    if (currentIndex < 0 || currentIndex >= this.shipmentSteps.length - 2) return null;
    return this.shipmentSteps[currentIndex + 1];
  }

  get canUpdateShipment(): boolean { return this.nextShipmentStatus !== null; }

  // UPDATE SHIPMENT STATUS
  async updateShipmentStatus(): Promise<void> {
    if (!this.selectedShipment?.id || !this.nextShipmentStatus) return;

    const nextStatus = this.nextShipmentStatus;
    const result = await Swal.fire({
      title: 'Update Shipment Status',
      html: `<div style="text-align:left;margin-bottom:15px;"><p style="color:#75847B;font-size:12px;">CURRENT STATUS</p><strong style="color:#173F35;">${this.selectedShipment.status}</strong><hr style="border:0;border-top:1px solid #E5E9E3;margin:15px 0;"><p style="color:#75847B;font-size:12px;">NEXT STATUS</p><strong style="color:#173F35;">${nextStatus}</strong></div>`,
      input: 'textarea',
      inputLabel: 'Remarks (Optional)',
      inputPlaceholder: 'Add shipment update or remarks...',
      showCancelButton: true,
      confirmButtonText: 'Confirm Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#173F35'
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({ title: 'Updating Shipment...', text: 'Please wait while we save the new status.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const updatedAt = new Date().toISOString();
      const newHistoryEntry: OrderStatusHistory = {
        status: nextStatus,
        updatedAt,
        ...(result.value?.trim() ? { remarks: result.value.trim() } : {})
      };

      const updatedHistory = [...(this.selectedShipment.statusHistory || []), newHistoryEntry];
      const timestampFields: Partial<Record<OrderStatus, keyof SilkOrder>> = {
        'Order Confirmed': 'confirmedAt',
        'Preparing Order': 'preparingAt',
        'Packing Completed': 'packingCompletedAt',
        'Ready for Dispatch': 'readyForDispatchAt',
        'Dispatched': 'dispatchedAt',
        'In Transit': 'inTransitAt'
      };

      const timestampField = timestampFields[nextStatus];
      const updates: Partial<SilkOrder> = { status: nextStatus, statusHistory: updatedHistory };
      if (timestampField) Object.assign(updates, { [timestampField]: updatedAt });

      await this.silkOrderService.updateOrder(this.selectedShipment.id, updates);

      this.selectedShipment = { ...this.selectedShipment, ...updates };
      const index = this.shipments.findIndex(order => order.id === this.selectedShipment?.id);
      if (index !== -1) this.shipments[index] = this.selectedShipment;

      this.cdr.detectChanges();
      await Swal.fire({ title: 'Shipment Updated!', text: `The order is now marked as ${nextStatus}.`, icon: 'success', confirmButtonColor: '#173F35' });
    } catch (error) {
      console.error('Error updating shipment status:', error);
      await Swal.fire({ title: 'Update Failed', text: 'Unable to update shipment status. Please try again.', icon: 'error', confirmButtonColor: '#173F35' });
    }
  }

  // SHIPMENT DETAILS AND TABS
  viewShipment(order: SilkOrder): void {
    this.selectedShipment = order;
    this.activeShipmentTab = 'overview';
    this.showShipmentDetails = true;
  }

  closeShipmentDetails(): void {
    this.showShipmentDetails = false;
    this.selectedShipment = null;
  }

  // SCANNER MODAL
  openScannerModal(): void {
    this.stopScanner();
    this.manualTrackingId = '';
    this.scannerError = '';
    this.scannedShipment = null;
    this.showScannerModal = true;
  }

  closeScannerModal(): void {
    this.stopScanner();
    this.showScannerModal = false;
  }

  async startScanner(): Promise<void> {
    if (this.isScannerActive) return;

    const video = this.scannerVideo?.nativeElement;
    if (!video) {
      this.scannerError = 'Camera preview is unavailable. Please close and reopen the scanner.';
      return;
    }

    this.scannerError = '';

    try {
      const reader = new BrowserMultiFormatReader();

      this.scannerControls = await reader.decodeFromVideoDevice(undefined, video, result => {
        if (result) this.handleScannedValue(result.getText());
      });

      this.isScannerActive = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Scanner camera error:', error);
      this.scannerError = 'Unable to access the camera. Please allow camera permission or use the manual Tracking ID search.';
      this.isScannerActive = false;
      this.cdr.detectChanges();
    }
  }

  stopScanner(): void {
    this.scannerControls?.stop();
    this.scannerControls = null;
    this.isScannerActive = false;
  }

  private handleScannedValue(value: string): void {
    this.stopScanner();
    this.manualTrackingId = this.extractTrackingId(value);
    this.findShipmentByTrackingId();
    this.cdr.detectChanges();
  }

  private extractTrackingId(value: string): string {
    const rawValue = value.trim();
    try {
      const url = new URL(rawValue);
      const trackingId = url.searchParams.get('trackingId') || url.searchParams.get('tracking') || url.searchParams.get('id');
      const lastPathSegment = url.pathname.split('/').filter(Boolean).pop();
      return trackingId || (lastPathSegment ? decodeURIComponent(lastPathSegment) : rawValue);
    } catch {
      return rawValue;
    }
  }

  // MANUAL TRACKING ID SEARCH
  findShipmentByTrackingId(): void {
    const trackingId = this.extractTrackingId(this.manualTrackingId).trim();

    if (!trackingId) {
      this.scannerError = 'Please enter a Tracking ID first.';
      this.scannedShipment = null;
      return;
    }

    const match = this.shipments.find(order => order.trackingId?.trim().toLowerCase() === trackingId.toLowerCase());

    this.scannedShipment = match || null;
    this.scannerError = match ? '' : 'No shipment was found with that Tracking ID. Please check the code and try again.';
    this.cdr.detectChanges();
  }

  // OPEN SCANNED SHIPMENT
  openScannedShipment(): void {
    if (!this.scannedShipment) return;

    this.stopScanner();
    this.selectedShipment = this.scannedShipment;
    this.activeShipmentTab = 'overview';
    this.showScannerModal = false;
    this.showShipmentDetails = true;
  }

  // OPEN RECEIVING DIRECTLY FROM SCANNER
  openReceivingFromScanner(): void {
    if (!this.scannedShipment || this.scannedShipment.status !== 'In Transit') return;

    this.selectedShipment = this.scannedShipment;
    this.showScannerModal = false;
    this.stopScanner();
    this.openReceivingForm();
  }

  // OPEN RECEIVING FORM
  openReceivingForm(): void {
    if (!this.selectedShipment || this.selectedShipment.status !== 'In Transit') return;

    this.receiverName = '';
    this.actualQuantityReceived = this.selectedShipment.quantity;
    this.packageCondition = 'Good';
    this.receivingRemarks = '';
    this.showReceivingForm = true;
  }

  closeReceivingForm(): void { this.showReceivingForm = false; }

  // CONFIRM DELIVERY
  async confirmDelivery(): Promise<void> {
    if (!this.selectedShipment?.id || this.selectedShipment.status !== 'In Transit') return;

    if (!this.receiverName.trim()) {
      await Swal.fire({ title: 'Receiver Required', text: 'Please enter the name of the person who received the shipment.', icon: 'warning', confirmButtonColor: '#173F35' });
      return;
    }

    if (this.actualQuantityReceived === null || !Number.isFinite(this.actualQuantityReceived) || this.actualQuantityReceived <= 0) {
      await Swal.fire({ title: 'Invalid Quantity', text: 'Please enter a valid quantity received.', icon: 'warning', confirmButtonColor: '#173F35' });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Delivery?',
      text: 'Please make sure the actual shipment has been received and verified.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm Delivery',
      cancelButtonText: 'Review Details',
      confirmButtonColor: '#173F35'
    });

    if (!result.isConfirmed) return;

    this.isConfirmingDelivery = true;

    try {
      Swal.fire({ title: 'Confirming Delivery...', text: 'Saving receiving information.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const receivedAt = new Date().toISOString();
      const newHistoryEntry: OrderStatusHistory = {
        status: 'Delivered',
        updatedAt: receivedAt,
        ...(this.receivingRemarks.trim() ? { remarks: this.receivingRemarks.trim() } : {})
      };

      const updatedHistory = [...(this.selectedShipment.statusHistory || []), newHistoryEntry];
      const updates: Partial<SilkOrder> = {
        status: 'Delivered',
        deliveredAt: receivedAt,
        receivedAt,
        receiverName: this.receiverName.trim(),
        actualQuantityReceived: this.actualQuantityReceived,
        packageCondition: this.packageCondition,
        receivingRemarks: this.receivingRemarks.trim(),
        statusHistory: updatedHistory
      };

      await this.silkOrderService.updateOrder(this.selectedShipment.id, updates);

      this.selectedShipment = { ...this.selectedShipment, ...updates };
      const index = this.shipments.findIndex(order => order.id === this.selectedShipment?.id);
      if (index !== -1) this.shipments[index] = this.selectedShipment;

      this.showReceivingForm = false;
      this.showShipmentDetails = true;
      this.activeShipmentTab = 'receiving';
      this.cdr.detectChanges();

      await Swal.fire({ title: 'Delivery Confirmed!', text: 'The shipment has been successfully marked as Delivered.', icon: 'success', confirmButtonColor: '#173F35' });
    } catch (error) {
      console.error('Error confirming delivery:', error);
      await Swal.fire({ title: 'Confirmation Failed', text: 'Unable to save the receiving details. Please try again.', icon: 'error', confirmButtonColor: '#173F35' });
    } finally {
      this.isConfirmingDelivery = false;
    }
  }
}
