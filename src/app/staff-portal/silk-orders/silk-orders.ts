
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SilkOrder {
  orderId: string;
  partnerName: string;
  location: string;
  silkType: string;
  quantity: number;
  deliveryDate: string;
  status:
    | 'Pending Review'
    | 'Confirmed'
    | 'Preparing'
    | 'Scheduled'
    | 'Delivered'
    | 'Rejected';
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

  activeFilter:
    | 'All Orders'
    | 'Pending Review'
    | 'Confirmed'
    | 'Preparing'
    | 'Scheduled'
    | 'Delivered'
    | 'Rejected' = 'All Orders';

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
      status: 'Scheduled',
    },
    {
      orderId: 'ORD-2026-002',
      partnerName: 'Mindanao Silk Studio',
      location: 'Cagayan de Oro',
      silkType: 'Cocoon silk',
      quantity: 18,
      deliveryDate: '2026-10-27',
      status: 'Preparing',
    },
    {
      orderId: 'ORD-2026-003',
      partnerName: 'Northern Silk Weavers',
      location: 'Malaybalay, Bukidnon',
      silkType: 'Silk yarn',
      quantity: 30,
      deliveryDate: '2026-10-29',
      status: 'Confirmed',
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
      status: 'Confirmed',
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

  filters: Array<
    | 'All Orders'
    | 'Pending Review'
    | 'Confirmed'
    | 'Preparing'
    | 'Scheduled'
    | 'Delivered'
    | 'Rejected'
  > = [
    'All Orders',
    'Pending Review',
    'Confirmed',
    'Preparing',
    'Scheduled',
    'Delivered',
    'Rejected',
  ];

  get filteredOrders(): SilkOrder[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.orders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(term) ||
        order.partnerName.toLowerCase().includes(term) ||
        order.location.toLowerCase().includes(term) ||
        order.silkType.toLowerCase().includes(term);

      const matchesFilter =
        this.activeFilter === 'All Orders' ||
        order.status === this.activeFilter;

      return matchesSearch && matchesFilter;
    });
  }

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
      (order) => order.status === 'Preparing'
    ).length;
  }

  get deliveredCount(): number {
    return this.orders.filter(
      (order) => order.status === 'Delivered'
    ).length;
  }

  setFilter(filter: typeof this.activeFilter): void {
    this.activeFilter = filter;
  }

  trackByOrderId(index: number, order: SilkOrder): string {
    return order.orderId;
  }
}
