
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type OrderStatus =
  | 'Pending Review'
  | 'Order Confirmed'
  | 'Preparing Order'
  | 'Packing Completed'
  | 'Ready for Dispatch'
  | 'Dispatched'
  | 'In Transit'
  | 'Delivered'
  | 'Rejected';

type OrderFilter = 'All Orders' | OrderStatus;

interface OrderStatusHistory {
  status: OrderStatus;
  updatedAt: string;
  remarks?: string;
}

interface SilkOrder {
  orderId: string;
  partnerName: string;
  location: string;
  silkType: string;
  quantity: number;
  deliveryDate: string;

  status: OrderStatus;

  // Order tracking information
  trackingId?: string;
  qrCode?: string;
  barcode?: string;
  trackingGenerated?: boolean;

  // Order timestamps
  confirmedAt?: string;
  preparingAt?: string;
  packingCompletedAt?: string;
  readyForDispatchAt?: string;
  dispatchedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  rejectedAt?: string;

  // Additional information
  rejectionReason?: string;
  statusHistory?: OrderStatusHistory[];
}

@Component({
  selector: 'app-silk-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silk-orders.html',
  styleUrl: './silk-orders.css',
})
export class SilkOrders {
  searchTerm = '';
  selectedOrder: SilkOrder | null = null;

  activeFilter: OrderFilter = 'All Orders';

  // Temporary sample data for interface design.
  // We will connect this to Firebase later.
  orders: SilkOrder[] = [
    {
      orderId: 'ORD-2026-001',
      partnerName: 'Halal Silk Cooperative',
      location: 'Cagayan de Oro',
      silkType: 'Silk yarn',
      quantity: 24,
      deliveryDate: '2026-10-26',
      status: 'Ready for Dispatch',
      trackingId: 'PTRI-TRK-2026-001',
      trackingGenerated: true,
    },
    {
      orderId: 'ORD-2026-002',
      partnerName: 'Mindanao Silk Studio',
      location: 'Cagayan de Oro',
      silkType: 'Cocoon silk',
      quantity: 18,
      deliveryDate: '2026-10-27',
      status: 'Preparing Order',
    },
    {
      orderId: 'ORD-2026-003',
      partnerName: 'Northern Silk Weavers',
      location: 'Malaybalay, Bukidnon',
      silkType: 'Silk yarn',
      quantity: 30,
      deliveryDate: '2026-10-29',
      status: 'Order Confirmed',
    },
    {
      orderId: 'ORD-2026-004',
      partnerName: 'Laguindingan Silk Collective',
      location: 'Laguindingan',
      silkType: 'Silk fabric',
      quantity: 12,
      deliveryDate: '2026-10-30',
      status: 'Pending Review',
    },
    {
      orderId: 'ORD-2026-005',
      partnerName: 'Halal Silk Cooperative',
      location: 'Cagayan de Oro',
      silkType: 'Silk yarn',
      quantity: 20,
      deliveryDate: '2026-11-02',
      status: 'Order Confirmed',
    },
    {
      orderId: 'ORD-2026-006',
      partnerName: 'Bukidnon Silk Producers',
      location: 'Malaybalay, Bukidnon',
      silkType: 'Cocoon silk',
      quantity: 15,
      deliveryDate: '2026-11-03',
      status: 'Pending Review',
    },
  ];

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

  // SEARCH AND FILTER
  get filteredOrders(): SilkOrder[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.orders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(term) ||
        order.partnerName.toLowerCase().includes(term) ||
        order.location.toLowerCase().includes(term) ||
        order.silkType.toLowerCase().includes(term) ||
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
  viewOrder(order: SilkOrder): void {
    this.selectedOrder = order;
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
