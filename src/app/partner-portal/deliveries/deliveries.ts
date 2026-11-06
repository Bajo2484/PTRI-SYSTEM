
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';

import { auth } from '../../services/firebase';
import {
  SilkOrderService,
  type SilkOrder,
  type OrderStatus
} from '../../services/silk-order.service';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deliveries.html',
  styleUrl: './deliveries.css',
})
export class Deliveries implements OnInit, OnDestroy {

  shipments: SilkOrder[] = [];
  selectedShipment: SilkOrder | null = null;

  isLoading = true;
  loadError = '';
  searchTerm = '';
  selectedStatusFilter = 'All';

  showTrackingModal = false;

  private authUnsubscribe?: () => void;
  private ordersUnsubscribe?: () => void;

  readonly shipmentSteps: OrderStatus[] = [
    'Pending Review',
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

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, user => {
      this.ordersUnsubscribe?.();
      this.ordersUnsubscribe = undefined;

      if (!user) {
        this.shipments = [];
        this.selectedShipment = null;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      this.loadPartnerShipments(user.uid);
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.ordersUnsubscribe?.();
  }

  // LOAD PARTNER SHIPMENTS IN REAL TIME
  loadPartnerShipments(partnerUid: string): void {
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    this.ordersUnsubscribe?.();

    this.ordersUnsubscribe = this.silkOrderService.listenToPartnerOrders(
      partnerUid,

      orders => {
        // Show ALL orders, including Pending Review and Rejected
        this.shipments = orders;

        // Keep the selected shipment updated in the modal
        if (this.selectedShipment) {
          const updatedShipment = orders.find(
            order => order.orderId === this.selectedShipment?.orderId
          );

          if (updatedShipment) {
            this.selectedShipment = updatedShipment;
          }
        }

        this.isLoading = false;
        this.loadError = '';
        this.cdr.detectChanges();
      },

      error => {
        console.error('Error loading partner deliveries:', error);

        this.loadError = 'Unable to load your shipment records. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    );
  }

  // SEARCH AND FILTER
  get filteredShipments(): SilkOrder[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.shipments.filter(order => {
      const matchesSearch = !search || [
        order.orderId,
        order.trackingId,
        order.silkType,
        order.location
      ].some(value => value?.toLowerCase().includes(search));

      const matchesStatus =
        this.selectedStatusFilter === 'All' ||
        (this.selectedStatusFilter === 'Preparing' &&
          ['Order Confirmed', 'Preparing Order', 'Packing Completed'].includes(order.status)) ||
        (this.selectedStatusFilter === 'In Transit' &&
          ['Ready for Dispatch', 'Dispatched', 'In Transit'].includes(order.status)) ||
        order.status === this.selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  // SUMMARY COUNTS
  get totalShipments(): number {
    return this.shipments.length;
  }

  get preparingCount(): number {
    return this.shipments.filter(order =>
      ['Order Confirmed', 'Preparing Order', 'Packing Completed'].includes(order.status)
    ).length;
  }

  get inTransitCount(): number {
    return this.shipments.filter(order =>
      ['Ready for Dispatch', 'Dispatched', 'In Transit'].includes(order.status)
    ).length;
  }

  get deliveredCount(): number {
    return this.shipments.filter(order => order.status === 'Delivered').length;
  }

  // OPEN TRACKING MODAL
  openTrackingModal(order: SilkOrder): void {
    this.selectedShipment = order;
    this.showTrackingModal = true;
    this.cdr.detectChanges();
  }

  // CLOSE TRACKING MODAL
  closeTrackingModal(): void {
    this.showTrackingModal = false;
    this.selectedShipment = null;
  }

  // CURRENT TIMELINE POSITION
  get currentStepIndex(): number {
    return this.selectedShipment
      ? this.shipmentSteps.indexOf(this.selectedShipment.status)
      : -1;
  }

  isStepCompleted(status: OrderStatus): boolean {
    const index = this.shipmentSteps.indexOf(status);
    return index !== -1 && index < this.currentStepIndex;
  }

  isCurrentStep(status: OrderStatus): boolean {
    return this.selectedShipment?.status === status;
  }

  isStepPending(status: OrderStatus): boolean {
    const index = this.shipmentSteps.indexOf(status);
    return index > this.currentStepIndex;
  }

  // GET TIMELINE HISTORY
  getStepHistory(status: OrderStatus) {
    return this.selectedShipment?.statusHistory?.find(
      item => item.status === status
    );
  }

  // FORMAT DATES
  formatDate(value?: string): string {
    if (!value) return 'Not yet updated';

    const date = new Date(value);

    if (isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // STATUS LABEL
  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      'Pending Review': 'Pending Review',
      'Order Confirmed': 'Order Confirmed',
      'Preparing Order': 'Preparing Order',
      'Packing Completed': 'Packing Completed',
      'Ready for Dispatch': 'Ready for Dispatch',
      'Dispatched': 'Dispatched',
      'In Transit': 'In Transit',
      'Delivered': 'Delivered',
      'Rejected': 'Rejected'
    };

    return labels[status];
  }

  // REFRESH SHIPMENTS
  async refreshShipments(): Promise<void> {
    const user = auth.currentUser;

    if (user) {
      this.loadPartnerShipments(user.uid);
    }
  }
}
