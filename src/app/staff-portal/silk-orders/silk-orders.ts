import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  SilkOrderService,
  type SilkOrder,
  type OrderStatus
} from '../../services/silk-order.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';

type OrderFilter = 'All Orders' | OrderStatus;



@Component({
  selector: 'app-silk-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silk-orders.html',
  styleUrl: './silk-orders.css',
})
export class SilkOrders implements OnInit {
  constructor(
  private silkOrderService: SilkOrderService,
  private cdr: ChangeDetectorRef,
  private router: Router
) {}

  ngOnInit(): void {
    this.loadOrders();
  }
  searchTerm = '';
  selectedOrder: SilkOrder | null = null;
  qrCodeImage = '';
  barcodeImage = '';

    isLoading = false;
  loadError = '';
  activeFilter: OrderFilter = 'All Orders';

// ORDERS FROM FIRESTORE
orders: SilkOrder[] = [];

  filters: OrderFilter[] = [
    'All Orders',
    'Pending Review',
    'Order Confirmed',
    'Preparing Order',
    'Packing Completed',
    'Ready for Dispatch',
    'Dispatched',
    'In Transit',
    'Delivered',
    'Rejected',
  ];

  private generateTrackingId(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `PTRI-${datePart}-${randomPart}`;
}

private async generateTrackingCodes(trackingId: string): Promise<void> {
  this.qrCodeImage = await QRCode.toDataURL(trackingId, {
    width: 220,
    margin: 2
  });

  const canvas = document.createElement('canvas');

  JsBarcode(canvas, trackingId, {
    format: 'CODE128',
    width: 2,
    height: 70,
    displayValue: true
  });

  this.barcodeImage = canvas.toDataURL('image/png');
}


async approveOrder(order: SilkOrder): Promise<void> {
  if (!order.id) {
    Swal.fire('Error', 'Order document ID is missing.', 'error');
    return;
  }

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const result = await Swal.fire({
    title: 'Approve this order?',
    text: 'Set the expected delivery date before approving.',
    input: 'date',
    inputLabel: 'Expected Delivery Date',
    inputAttributes: {
      min: minDate
    },
    inputValue: order.expectedDeliveryDate || '',
    showCancelButton: true,
    confirmButtonText: 'Approve Order',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#245638',
    background: '#fffdf8',
    color: '#493a2c',
    inputValidator: (value) => {
      if (!value) {
        return 'Please select an expected delivery date.';
      }
      return null;
    }
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Approving Order...',
    html: 'Generating Tracking ID, QR Code, and Barcode. Please wait.',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    this.cdr.detectChanges();

    const trackingId = this.generateTrackingId();

    await this.silkOrderService.updateOrder(order.id, {
      status: 'Order Confirmed',
      expectedDeliveryDate: result.value,
      trackingId,
      trackingGenerated: true,
      confirmedAt: new Date().toISOString(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'Order Confirmed',
          updatedAt: new Date().toISOString(),
          remarks: 'Order approved by PTRI Staff.'
        }
      ]
    });

    await this.generateTrackingCodes(trackingId);

    this.cdr.detectChanges();

    await this.loadOrders();

    this.selectedOrder = this.orders.find(
      item => item.id === order.id
    ) || null;

    this.cdr.detectChanges();

    Swal.fire({
      title: 'Order Approved!',
      text: 'Expected delivery date, Tracking ID, QR Code, and Barcode saved successfully.',
      icon: 'success',
      confirmButtonText: 'Done',
      confirmButtonColor: '#245638'
    });

  } catch (error) {
    console.error('Error approving order:', error);
    Swal.fire('Error', 'Unable to approve this order. Please try again.', 'error');
  }
}


async setExpectedDeliveryDate(order: SilkOrder): Promise<void> {
  if (!order.id) {
    Swal.fire('Error', 'Order document ID is missing.', 'error');
    return;
  }

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const result = await Swal.fire({
    title: 'Set Expected Delivery Date',
    text: 'Update the expected delivery date for this shipment.',
    input: 'date',
    inputLabel: 'Expected Delivery Date',
    inputAttributes: { min: minDate },
    inputValue: order.expectedDeliveryDate || '',
    showCancelButton: true,
    confirmButtonText: 'Save Date',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#245638',
    background: '#fffdf8',
    color: '#493a2c',
    inputValidator: (value) => {
      if (!value) {
        return 'Please select an expected delivery date.';
      }
      return null;
    }
  });

  if (!result.isConfirmed) return;

  try {
    Swal.fire({
      title: 'Saving Date...',
      text: 'Please wait.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    await this.silkOrderService.updateOrder(order.id, {
      expectedDeliveryDate: result.value
    });

    await this.loadOrders();

    this.selectedOrder = this.orders.find(
      item => item.id === order.id
    ) || null;

    this.cdr.detectChanges();

    Swal.fire({
      title: 'Date Updated!',
      text: 'The expected delivery date has been saved successfully.',
      icon: 'success',
      confirmButtonColor: '#245638'
    });

  } catch (error) {
    console.error('Error updating expected delivery date:', error);
    Swal.fire('Error', 'Unable to save the expected delivery date.', 'error');
  }
}



async rejectOrder(order: SilkOrder): Promise<void> {
  if (!order.id) {
    Swal.fire('Error', 'Order document ID is missing.', 'error');
    return;
  }

  const result = await Swal.fire({
    title: 'Reject this order?',
    input: 'textarea',
    inputLabel: 'Reason for rejection',
    inputPlaceholder: 'Enter the reason...',
    inputAttributes: {
      'aria-label': 'Reason for rejection'
    },
    showCancelButton: true,
    confirmButtonText: 'Reject Order',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc3545',
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Please provide a reason for rejection.';
      }
      return null;
    }
  });

  if (!result.isConfirmed) return;

  try {
    const reason = result.value.trim();

    await this.silkOrderService.updateOrder(order.id, {
      status: 'Rejected',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'Rejected',
          updatedAt: new Date().toISOString(),
          remarks: reason
        }
      ]
    });

    await this.loadOrders();

    this.selectedOrder = this.orders.find(item => item.id === order.id) || null;

    Swal.fire('Order Rejected', 'The rejection reason has been saved.', 'success');

  } catch (error) {
    console.error('Error rejecting order:', error);
    Swal.fire('Error', 'Unable to reject this order. Please try again.', 'error');
  }
}

  // LOAD ORDERS FROM FIRESTORE
async loadOrders(): Promise<void> {
  this.isLoading = true;
  this.loadError = '';
  this.cdr.detectChanges();

  try {
    this.orders = await this.silkOrderService.getAllOrders();

  } catch (error) {
    console.error('Unable to load silk orders:', error);
    this.loadError = 'Unable to load orders. Please try again.';
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

  // SEARCH AND FILTER
  get filteredOrders(): SilkOrder[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.orders.filter((order) => {
      const matchesSearch =
  (order.orderId || '').toLowerCase().includes(term) ||
  (order.partnerName || '').toLowerCase().includes(term) ||
  (order.location || '').toLowerCase().includes(term) ||
  (order.silkType || '').toLowerCase().includes(term) ||
  (order.trackingId?.toLowerCase().includes(term) ?? false);

      const matchesFilter =
        this.activeFilter === 'All Orders' ||
        order.status === this.activeFilter;

      return matchesSearch && matchesFilter;
    });
  }

  // SUMMARY COUNTERS
  get totalOrders(): number {
    return this.orders.length;
  }

  get pendingReviewCount(): number {
    return this.orders.filter(
      (order) => order.status === 'Pending Review'
    ).length;
  }

  get preparingCount(): number {
    return this.orders.filter(
      (order) =>
        order.status === 'Preparing Order' ||
        order.status === 'Packing Completed'
    ).length;
  }

  get deliveredCount(): number {
    return this.orders.filter(
      (order) => order.status === 'Delivered'
    ).length;
  }

  get confirmedCount(): number {
    return this.orders.filter(
      (order) => order.status === 'Order Confirmed'
    ).length;
  }

  get inTransitCount(): number {
    return this.orders.filter(
      (order) =>
        order.status === 'Dispatched' ||
        order.status === 'In Transit'
    ).length;
  }

  // FILTER SELECTION
  setFilter(filter: OrderFilter): void {
    this.activeFilter = filter;
  }

  // ORDER SELECTION
  async viewOrder(order: SilkOrder): Promise<void> {
  this.selectedOrder = order;

  this.qrCodeImage = '';
  this.barcodeImage = '';

  if (order.trackingId && order.trackingGenerated) {
    try {
      await this.generateTrackingCodes(order.trackingId);
    } catch (error) {
      console.error('Unable to generate tracking codes:', error);
    }
  }
}
openOrderDetails(order: SilkOrder): void {
  if (!order.id) {
    return;
  }

  this.router.navigate(['/staff/silk-orders', order.id], {
    queryParams: {
      search: this.searchTerm || null,
      filter: this.activeFilter === 'All Orders' ? null : this.activeFilter
    }
  });
}

  closeOrderDetails(): void {
    this.selectedOrder = null;
  }

  // STATUS LABEL
  getStatusLabel(status: OrderStatus): string {
    return status;
  }

  // TRACK BY
  trackByOrderId(index: number, order: SilkOrder): string {
    return order.orderId;
  }
}
