import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SilkOrderService, type SilkOrder } from '../../services/silk-order.service';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.css',
})
export class OrderDetails implements OnInit {
  order: SilkOrder | null = null;
  isLoading = false;
  loadError = '';
    qrCodeImage = '';
  barcodeImage = '';

    constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: SilkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
  const orderId = this.route.snapshot.paramMap.get('id');

  if (!orderId) {
    this.loadError = 'Order ID not found.';
    return;
  }

  this.isLoading = true;
  this.cdr.detectChanges();

  try {
    const orders = await this.orderService.getAllOrders();

    this.order = orders.find(order => order.id === orderId) || null;

    if (this.order?.trackingId && this.order.trackingGenerated) {
  await this.generateTrackingCodes(this.order.trackingId);
}

    if (!this.order) {
      this.loadError = 'The selected order could not be found.';
    }

  } catch (error) {
    console.error('Error loading order details:', error);
    this.loadError = 'Unable to load order details. Please try again.';

  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
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
    return;
  }

  const result = await Swal.fire({
    title: 'Approve this order?',
    text: 'The system will generate a Tracking ID, QR Code, and Barcode.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Approve',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#173F35'
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    Swal.fire({
      title: 'Approving Order...',
      text: 'Please wait.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const trackingId = this.generateTrackingId();

    await this.generateTrackingCodes(trackingId);

    const updatedHistory = [
      ...(order.statusHistory || []),
      {
        status: 'Order Confirmed' as const,
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await this.orderService.updateOrder(order.id, {
      status: 'Order Confirmed',
      trackingId,
      trackingGenerated: true,
      confirmedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    this.order = {
      ...order,
      status: 'Order Confirmed',
      trackingId,
      trackingGenerated: true,
      statusHistory: updatedHistory
    };

    this.cdr.detectChanges();

    await Swal.fire({
      title: 'Order Approved!',
      text: 'Tracking ID, QR Code, and Barcode have been generated.',
      icon: 'success',
      confirmButtonColor: '#173F35'
    });

  } catch (error) {
    console.error('Error approving order:', error);

    await Swal.fire({
      title: 'Approval Failed',
      text: 'Unable to approve this order. Please try again.',
      icon: 'error',
      confirmButtonColor: '#173F35'
    });
  }
}

private generateTrackingId(): string {
  const date = new Date();

  const datePart = date.toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `PTRI-${datePart}-${randomPart}`;
}

async rejectOrder(order: SilkOrder): Promise<void> {
  if (!order.id) {
    return;
  }

  const result = await Swal.fire({
    title: 'Reject this order?',
    input: 'textarea',
    inputLabel: 'Reason for rejection',
    inputPlaceholder: 'Enter the reason for rejecting this order...',
    inputAttributes: {
      'aria-label': 'Reason for rejection'
    },
    showCancelButton: true,
    confirmButtonText: 'Reject Order',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#B42318',
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Please provide a reason for rejection.';
      }

      return null;
    }
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    Swal.fire({
      title: 'Rejecting Order...',
      text: 'Please wait.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const rejectionReason = result.value.trim();

    const updatedHistory = [
      ...(order.statusHistory || []),
      {
        status: 'Rejected' as const,
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await this.orderService.updateOrder(order.id, {
      status: 'Rejected',
      rejectionReason,
      rejectedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    this.order = {
      ...order,
      status: 'Rejected',
      rejectionReason,
      statusHistory: updatedHistory
    };

    this.cdr.detectChanges();

    await Swal.fire({
      title: 'Order Rejected',
      text: 'The order has been rejected successfully.',
      icon: 'success',
      confirmButtonColor: '#173F35'
    });

  } catch (error) {
    console.error('Error rejecting order:', error);

    await Swal.fire({
      title: 'Rejection Failed',
      text: 'Unable to reject this order. Please try again.',
      icon: 'error',
      confirmButtonColor: '#173F35'
    });
  }
}

    goBack(): void {
    this.router.navigate(['/staff/silk-orders'], {
      queryParams: {
        search: this.route.snapshot.queryParamMap.get('search'),
        filter: this.route.snapshot.queryParamMap.get('filter')
      }
    });
  }
}