
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SilkOrderService,
  type SilkOrder,
  type OrderStatus,
  type OrderStatusHistory
} from '../../services/silk-order.service';

@Component({
  selector: 'app-supply-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supply-delivery.html',
  styleUrl: './supply-delivery.css',
})
export class SupplyDelivery implements OnInit {

  shipments: SilkOrder[] = [];

  selectedShipment: SilkOrder | null = null;
  showShipmentDetails = false;

  isLoading = false;
  loadError = '';

    // RECEIVING FORM
  showReceivingForm = false;

  receiverName = '';
  actualQuantityReceived: number | null = null;
  packageCondition: 'Good' | 'Damaged' | 'Incomplete' = 'Good';
  receivingRemarks = '';
  isConfirmingDelivery = false;

  readonly shipmentStatuses: OrderStatus[] = [
    'Order Confirmed',
    'Preparing Order',
    'Packing Completed',
    'Ready for Dispatch',
    'Dispatched',
    'In Transit',
    'Delivered'
  ];

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
    private silkOrderService: SilkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadShipments();
  }

  async loadShipments(): Promise<void> {

    this.isLoading = true;
    this.loadError = '';

    try {

      const orders = await this.silkOrderService.getAllOrders();

      this.shipments = orders.filter(order =>
        this.shipmentStatuses.includes(order.status)
      );

    } catch (error) {

      console.error('Error loading shipments:', error);

      this.loadError = 'Unable to load shipment records. Please try again.';

    } finally {

      this.isLoading = false;
      this.cdr.detectChanges();

    }
  }

  get totalShipments(): number {
    return this.shipments.length;
  }

  get preparingCount(): number {
    return this.shipments.filter(order =>
      ['Preparing Order', 'Packing Completed'].includes(order.status)
    ).length;
  }

  get inTransitCount(): number {
    return this.shipments.filter(order =>
      ['Dispatched', 'In Transit'].includes(order.status)
    ).length;
  }

  get deliveredCount(): number {
    return this.shipments.filter(order =>
      order.status === 'Delivered'
    ).length;
  }

  // SHIPMENT TIMELINE

  get currentStepIndex(): number {
    if (!this.selectedShipment) {
      return -1;
    }

    return this.shipmentSteps.indexOf(this.selectedShipment.status);
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
    const entry = history.find(item => item.status === status);

    return entry?.updatedAt || null;
  }

  get nextShipmentStatus(): OrderStatus | null {
    if (!this.selectedShipment) {
      return null;
    }

    const currentIndex = this.shipmentSteps.indexOf(
      this.selectedShipment.status
    );

    // Delivered must be confirmed through Receiving.
    if (currentIndex < 0 || currentIndex >= this.shipmentSteps.length - 2) {
      return null;
    }

    return this.shipmentSteps[currentIndex + 1];
  }

  get canUpdateShipment(): boolean {
    return this.nextShipmentStatus !== null;
  }

  // UPDATE SHIPMENT STATUS

  async updateShipmentStatus(): Promise<void> {

    if (!this.selectedShipment?.id || !this.nextShipmentStatus) {
      return;
    }

    const nextStatus = this.nextShipmentStatus;

    const result = await Swal.fire({
      title: 'Update Shipment Status',
      html: `
        <div style="text-align:left; margin-bottom:15px;">
          <p style="color:#75847B; font-size:12px;">CURRENT STATUS</p>
          <strong style="color:#173F35;">${this.selectedShipment.status}</strong>

          <hr style="border:0; border-top:1px solid #E5E9E3; margin:15px 0;">

          <p style="color:#75847B; font-size:12px;">NEXT STATUS</p>
          <strong style="color:#173F35;">${nextStatus}</strong>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Remarks (Optional)',
      inputPlaceholder: 'Add shipment update or remarks...',
      showCancelButton: true,
      confirmButtonText: 'Confirm Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#173F35'
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
        ...(this.selectedShipment.statusHistory || []),
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

      await this.silkOrderService.updateOrder(
        this.selectedShipment.id,
        updates
      );

      this.selectedShipment = {
        ...this.selectedShipment,
        ...updates
      };

      const index = this.shipments.findIndex(
        order => order.id === this.selectedShipment?.id
      );

      if (index !== -1) {
        this.shipments[index] = this.selectedShipment;
      }

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

  // SHIPMENT DETAILS MODAL

  viewShipment(order: SilkOrder): void {
    this.selectedShipment = order;
    this.showShipmentDetails = true;
  }

  closeShipmentDetails(): void {
    this.showShipmentDetails = false;
    this.selectedShipment = null;
  }

    // OPEN RECEIVING FORM
  openReceivingForm(): void {
    if (!this.selectedShipment || this.selectedShipment.status !== 'In Transit') {
      return;
    }

    this.receiverName = '';
    this.actualQuantityReceived = this.selectedShipment.quantity;
    this.packageCondition = 'Good';
    this.receivingRemarks = '';

    this.showReceivingForm = true;
  }

  // CLOSE RECEIVING FORM
  closeReceivingForm(): void {
    this.showReceivingForm = false;
  }

    // CONFIRM DELIVERY
  async confirmDelivery(): Promise<void> {

    if (!this.selectedShipment?.id) {
      return;
    }

    if (this.selectedShipment.status !== 'In Transit') {
      return;
    }

    if (!this.receiverName.trim()) {
      await Swal.fire({
        title: 'Receiver Required',
        text: 'Please enter the name of the person who received the shipment.',
        icon: 'warning',
        confirmButtonColor: '#173F35'
      });
      return;
    }

    if (
      this.actualQuantityReceived === null ||
      !Number.isFinite(this.actualQuantityReceived) ||
      this.actualQuantityReceived <= 0
    ) {
      await Swal.fire({
        title: 'Invalid Quantity',
        text: 'Please enter a valid quantity received.',
        icon: 'warning',
        confirmButtonColor: '#173F35'
      });
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

    if (!result.isConfirmed) {
      return;
    }

    this.isConfirmingDelivery = true;

    try {

      Swal.fire({
        title: 'Confirming Delivery...',
        text: 'Saving receiving information.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const receivedAt = new Date().toISOString();

      const newHistoryEntry: OrderStatusHistory = {
        status: 'Delivered',
        updatedAt: receivedAt,
        ...(this.receivingRemarks.trim()
          ? { remarks: this.receivingRemarks.trim() }
          : {})
      };

      const updatedHistory = [
        ...(this.selectedShipment.statusHistory || []),
        newHistoryEntry
      ];

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

      await this.silkOrderService.updateOrder(
        this.selectedShipment.id,
        updates
      );

      this.selectedShipment = {
        ...this.selectedShipment,
        ...updates
      };

      const index = this.shipments.findIndex(
        order => order.id === this.selectedShipment?.id
      );

      if (index !== -1) {
        this.shipments[index] = this.selectedShipment;
      }

      this.showReceivingForm = false;

      this.cdr.detectChanges();

      await Swal.fire({
        title: 'Delivery Confirmed!',
        text: 'The shipment has been successfully marked as Delivered.',
        icon: 'success',
        confirmButtonColor: '#173F35'
      });

    } catch (error) {

      console.error('Error confirming delivery:', error);

      await Swal.fire({
        title: 'Confirmation Failed',
        text: 'Unable to save the receiving details. Please try again.',
        icon: 'error',
        confirmButtonColor: '#173F35'
      });

    } finally {
      this.isConfirmingDelivery = false;
    }
  }
}
