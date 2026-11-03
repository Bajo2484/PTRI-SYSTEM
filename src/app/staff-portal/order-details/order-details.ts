import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SilkOrderService,
  type SilkOrder,
  type OrderStatus,
  type OrderStatusHistory
} from '../../services/silk-order.service';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';


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

  readonly shipmentSteps: OrderStatus[] = [
    'Order Confirmed',
    'Preparing Order',
    'Packing Completed',
    'Ready for Dispatch',
    'Dispatched',
    'In Transit',
    'Delivered'
  ];

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

  // GENERATE QR CODE AND BARCODE

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

  // DOWNLOAD TRACKING CODES

  downloadTrackingCode(
    imageData: string,
    fileName: string
  ): void {

    if (!imageData) {
      return;
    }

    const link = document.createElement('a');

    link.href = imageData;
    link.download = fileName;

    link.click();
  }

  downloadQRCode(): void {

    if (!this.order?.trackingId) {
      return;
    }

    this.downloadTrackingCode(
      this.qrCodeImage,
      `${this.order.trackingId}-QR.png`
    );
  }

  downloadBarcode(): void {

    if (!this.order?.trackingId) {
      return;
    }

    this.downloadTrackingCode(
      this.barcodeImage,
      `${this.order.trackingId}-Barcode.png`
    );
  }

  // DOWNLOAD PRINTABLE SHIPMENT LABEL

async downloadShipmentLabel(): Promise<void> {

  if (!this.order?.trackingId || !this.qrCodeImage || !this.barcodeImage) {
    await Swal.fire({
      title: 'Tracking Codes Not Available',
      text: 'Please make sure this order has been approved and tracking codes are generated.',
      icon: 'warning',
      confirmButtonColor: '#173F35'
    });
    return;
  }

  const order = this.order;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5'
  });

  const pageWidth = 210;
  const pageHeight = 148;

  // COLORS
  const forestGreen: [number, number, number] = [23, 63, 53];
  const silkGold: [number, number, number] = [214, 174, 85];
  const ivory: [number, number, number] = [247, 245, 239];
  const darkText: [number, number, number] = [38, 59, 50];
  const grayText: [number, number, number] = [110, 120, 113];

  // BACKGROUND
  pdf.setFillColor(...ivory);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // HEADER
  pdf.setFillColor(...forestGreen);
  pdf.roundedRect(7, 7, 196, 25, 3, 3, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('PTRI', 13, 18);

  pdf.setFontSize(8);
  pdf.setTextColor(232, 216, 172);
  pdf.text('SILK SUPPLY & DELIVERY', 13, 24);

  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.text('SHIPMENT IDENTIFICATION LABEL', 197, 20, {
    align: 'right'
  });

  // ORDER INFORMATION PANEL
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(7, 37, 112, 82, 3, 3, 'F');

  pdf.setTextColor(...silkGold);
  pdf.setFontSize(9);
  pdf.text('ORDER INFORMATION', 13, 46);

  pdf.setTextColor(...forestGreen);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(order.orderId || 'N/A', 13, 55);

  pdf.setFontSize(8);
  pdf.setTextColor(...grayText);
  pdf.text('TRACKING ID', 13, 63);

  pdf.setFontSize(10);
  pdf.setTextColor(...darkText);
  pdf.text(order.trackingId || 'N/A', 13, 69);

  pdf.setDrawColor(225, 228, 220);
  pdf.line(13, 74, 113, 74);

  // PARTNER
  pdf.setFontSize(7);
  pdf.setTextColor(...grayText);
  pdf.text('PARTNER NAME', 13, 82);

  pdf.setFontSize(9);
  pdf.setTextColor(...darkText);
  pdf.setFont('helvetica', 'bold');
  pdf.text(order.partnerName || 'N/A', 13, 88);

  // PRODUCT
  pdf.setFontSize(7);
  pdf.setTextColor(...grayText);
  pdf.text('SILK TYPE', 13, 97);

  pdf.setFontSize(9);
  pdf.setTextColor(...darkText);
  pdf.text(order.silkType || 'N/A', 13, 103);

  // QUANTITY
  pdf.setFontSize(7);
  pdf.setTextColor(...grayText);
  pdf.text('QUANTITY', 70, 97);

  pdf.setFontSize(9);
  pdf.setTextColor(...darkText);
  pdf.text(`${order.quantity} kg`, 70, 103);

  // DESTINATION
  pdf.setFontSize(7);
  pdf.setTextColor(...grayText);
  pdf.text('DELIVERY DESTINATION', 13, 111);

  pdf.setFontSize(9);
  pdf.setTextColor(...darkText);
  pdf.text(order.location || 'N/A', 13, 116);

  // QR CODE PANEL
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(124, 37, 79, 82, 3, 3, 'F');

  pdf.setTextColor(...forestGreen);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('SCAN TO TRACK SHIPMENT', 163.5, 46, {
    align: 'center'
  });

  // LARGE QR CODE
  pdf.addImage(
    this.qrCodeImage,
    'PNG',
    140,
    49,
    47,
    47
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...grayText);
  pdf.text('Order Details | Shipment Monitoring', 163.5, 101, {
    align: 'center'
  });

  // SMALL BARCODE
  pdf.addImage(
    this.barcodeImage,
    'PNG',
    143,
    105,
    41,
    10
  );

  // FOOTER
  pdf.setFillColor(...forestGreen);
  pdf.roundedRect(7, 124, 196, 15, 2, 2, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('HANDLE WITH CARE', 105, 133, {
    align: 'center'
  });

  // DOWNLOAD
  pdf.save(`${order.trackingId}-Shipment-Label.pdf`);

}

  // APPROVE ORDER

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

      const updatedAt = new Date().toISOString();

      const updatedHistory: OrderStatusHistory[] = [
        ...(order.statusHistory || []),
        {
          status: 'Order Confirmed',
          updatedAt
        }
      ];

      await this.orderService.updateOrder(order.id, {
        status: 'Order Confirmed',
        trackingId,
        trackingGenerated: true,
        confirmedAt: updatedAt,
        statusHistory: updatedHistory
      });

      this.order = {
        ...order,
        status: 'Order Confirmed',
        trackingId,
        trackingGenerated: true,
        confirmedAt: updatedAt,
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

  // REJECT ORDER

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
      const updatedAt = new Date().toISOString();

      const updatedHistory: OrderStatusHistory[] = [
        ...(order.statusHistory || []),
        {
          status: 'Rejected',
          updatedAt
        }
      ];

      await this.orderService.updateOrder(order.id, {
        status: 'Rejected',
        rejectionReason,
        rejectedAt: updatedAt,
        statusHistory: updatedHistory
      });

      this.order = {
        ...order,
        status: 'Rejected',
        rejectionReason,
        rejectedAt: updatedAt,
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

  // SHIPMENT PROGRESS

  get currentStepIndex(): number {

    if (!this.order) {
      return -1;
    }

    return this.shipmentSteps.indexOf(this.order.status);
  }

  isStepCompleted(status: OrderStatus): boolean {

    const stepIndex = this.shipmentSteps.indexOf(status);

    return stepIndex !== -1 && stepIndex < this.currentStepIndex;
  }

  isCurrentStep(status: OrderStatus): boolean {

    return this.order?.status === status;
  }

  getStepDate(status: OrderStatus): string | null {

    const history = this.order?.statusHistory || [];

    const entry = history.find(item => item.status === status);

    return entry?.updatedAt || null;
  }

  get nextShipmentStatus(): OrderStatus | null {

    if (!this.order) {
      return null;
    }

    const currentIndex = this.shipmentSteps.indexOf(this.order.status);

    // Delivered must be confirmed through the Receiving Scanner.
    if (currentIndex < 0 || currentIndex >= this.shipmentSteps.length - 2) {
      return null;
    }

    return this.shipmentSteps[currentIndex + 1];
  }

  get canUpdateShipment(): boolean {

    return this.nextShipmentStatus !== null;
  }

  // UPDATE SHIPMENT STATUS MODAL

  async updateShipmentStatus(): Promise<void> {

    if (!this.order?.id || !this.nextShipmentStatus) {
      return;
    }

    const nextStatus = this.nextShipmentStatus;

    const result = await Swal.fire({
      title: 'Update Shipment Status',
      html: `
        <div style="text-align:left; margin-bottom:15px;">
          <p style="color:#75847B; font-size:12px; margin-bottom:5px;">
            CURRENT STATUS
          </p>
          <strong style="color:#173F35;">
            ${this.order.status}
          </strong>

          <hr style="border:0; border-top:1px solid #E5E9E3; margin:15px 0;">

          <p style="color:#75847B; font-size:12px; margin-bottom:5px;">
            NEXT STATUS
          </p>
          <strong style="color:#173F35;">
            ${nextStatus}
          </strong>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Remarks (Optional)',
      inputPlaceholder: 'Add shipment update or remarks...',
      showCancelButton: true,
      confirmButtonText: 'Confirm Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#173F35',
      inputAttributes: {
        'aria-label': 'Shipment remarks'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    try {

      Swal.fire({
        title: 'Updating Shipment...',
        text: 'Please wait while we save the new status.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const updatedAt = new Date().toISOString();

      const newHistoryEntry: OrderStatusHistory = {
        status: nextStatus,
        updatedAt,
        ...(result.value?.trim()
          ? { remarks: result.value.trim() }
          : {})
      };

      const updatedHistory = [
        ...(this.order.statusHistory || []),
        newHistoryEntry
      ];

      const timestampFields: Partial<Record<OrderStatus, keyof SilkOrder>> = {
        'Order Confirmed': 'confirmedAt',
        'Preparing Order': 'preparingAt',
        'Packing Completed': 'packingCompletedAt',
        'Ready for Dispatch': 'readyForDispatchAt',
        'Dispatched': 'dispatchedAt',
        'In Transit': 'inTransitAt'
      };

      const timestampField = timestampFields[nextStatus];

      const updates: Partial<SilkOrder> = {
        status: nextStatus,
        statusHistory: updatedHistory
      };

      if (timestampField) {
        Object.assign(updates, {
          [timestampField]: updatedAt
        });
      }

      await this.orderService.updateOrder(this.order.id, updates);

      this.order = {
        ...this.order,
        ...updates
      };

      this.cdr.detectChanges();

      await Swal.fire({
        title: 'Shipment Updated!',
        text: `The order is now marked as ${nextStatus}.`,
        icon: 'success',
        confirmButtonColor: '#173F35'
      });

    } catch (error) {

      console.error('Error updating shipment status:', error);

      await Swal.fire({
        title: 'Update Failed',
        text: 'Unable to update shipment status. Please try again.',
        icon: 'error',
        confirmButtonColor: '#173F35'
      });

    }
  }

  // BACK TO SILK ORDERS

  goBack(): void {

    this.router.navigate(['/staff/silk-orders'], {
      queryParams: {
        search: this.route.snapshot.queryParamMap.get('search'),
        filter: this.route.snapshot.queryParamMap.get('filter')
      }
    });
  }

}
