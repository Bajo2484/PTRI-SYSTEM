
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SilkOrderService, SilkOrder } from '../../services/silk-order.service';
import { FarmerProductionService, FarmerProductionRecord } from '../../services/farmer-production.service';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.css',
})
export class StaffDashboard implements OnInit {
  allOrders: SilkOrder[] = [];
  allProductions: FarmerProductionRecord[] = [];
  isLoading = true;

  todayLabel = new Date().toLocaleDateString('en-PH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  monthLabel = new Date().toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  // MONTHLY FARMER PRODUCTION GRAPH
  monthlyProduction: { month: string; quantity: number }[] = [];

  productionGraphYear = new Date().getFullYear();
  currentMonthIndex = new Date().getMonth();

  stats = [
    { title: 'Active partner orders', value: '0', detail: 'Loading order records...', icon: '▣', color: 'teal' },
    { title: 'Available silk yarn', value: 'Not tracked', detail: 'Inventory records are not yet available', icon: '⬡', color: 'orange' },
    { title: 'Expected cocoon output', value: '0 kg', detail: '0 kg confirmed · 0 kg awaiting', icon: '♧', color: 'green' },
    { title: 'Scheduled movements', value: '0', detail: 'Upcoming partner deliveries', icon: '⇄', color: 'blue' },
  ];

  stockDemand: { date: string; onHand: number; reserved: number }[] = [];

  alerts: {
    icon: string;
    title: string;
    description: string;
    action: string;
    type: string;
    link: string;
  }[] = [];

  recentOrders: {
    id: string;
    partner: string;
    material: string;
    quantity: string;
    requested: string;
    status: string;
  }[] = [];

  upcomingMovements: {
    day: string;
    weekday: string;
    title: string;
    description: string;
    time: string;
  }[] = [];

  constructor(
    private silkOrderService: SilkOrderService,
    private farmerProductionService: FarmerProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;

    try {
      const [orders, productions] = await Promise.all([
        this.silkOrderService.getAllOrders(),
        this.farmerProductionService.getAllProductions(),
      ]);

      this.allOrders = orders || [];
      this.allProductions = productions || [];

      this.generateDashboardStats();
      this.generateMonthlyProductionGraph();
      this.generateRecentOrders();
      this.generateUpcomingMovements();
      this.generateAlerts();

    } catch (error) {
      console.error('Error loading staff dashboard data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // MONTHLY PRODUCTION GRAPH
  private generateMonthlyProductionGraph(): void {
    const year = this.productionGraphYear;

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    this.monthlyProduction = monthNames.map((month, index) => {
      const total = this.allProductions
        .filter(record => {
          const expectedDate = this.parseDate(record.expectedAvailability);

          return expectedDate !== null &&
            expectedDate.getFullYear() === year &&
            expectedDate.getMonth() === index;
        })
        .reduce((sum, record) => {
          return sum + Number(record.quantity || 0);
        }, 0);

      return {
        month,
        quantity: total,
      };
    });
  }

  // DYNAMIC BAR HEIGHT FOR MONTHLY PRODUCTION
  getMonthlyProductionBarHeight(quantity: number): number {
    const maxQuantity = Math.max(
      ...this.monthlyProduction.map(item => item.quantity),
      0
    );

    if (maxQuantity === 0 || quantity <= 0) {
      return 0;
    }

    return Math.max((quantity / maxQuantity) * 100, 3);
  }

  private generateDashboardStats(): void {
    const activeOrders = this.allOrders.filter(order =>
      order.status !== 'Delivered' && order.status !== 'Rejected'
    );

    const pendingOrders = this.allOrders.filter(order =>
      order.status === 'Pending Review'
    );

    const totalRequested = activeOrders.reduce(
      (total, order) => total + Number(order.quantity || 0), 0
    );

    const reviewedProductions = this.allProductions.filter(
      production => production.status === 'Reviewed'
    );

    const pendingProductions = this.allProductions.filter(
      production => production.status === 'Pending Review'
    );

    const confirmedQuantity = reviewedProductions.reduce(
      (total, production) => total + Number(production.quantity || 0), 0
    );

    const pendingQuantity = pendingProductions.reduce(
      (total, production) => total + Number(production.quantity || 0), 0
    );

    const productionUnit = this.allProductions.find(
      production => production.unit
    )?.unit || 'kg';

    const upcomingCount = this.getUpcomingOrders().length;

    this.stats = [
      {
        title: 'Active partner orders',
        value: String(activeOrders.length),
        detail: `${this.formatQuantity(totalRequested)} kg requested · ${pendingOrders.length} pending review`,
        icon: '▣',
        color: 'teal',
      },
      {
        title: 'Available silk yarn',
        value: 'Not tracked',
        detail: 'Inventory records are not yet available',
        icon: '⬡',
        color: 'orange',
      },
      {
        title: 'Expected cocoon output',
        value: `${this.formatQuantity(confirmedQuantity + pendingQuantity)} ${productionUnit}`,
        detail: `${this.formatQuantity(confirmedQuantity)} ${productionUnit} confirmed · ${this.formatQuantity(pendingQuantity)} ${productionUnit} awaiting`,
        icon: '♧',
        color: 'green',
      },
      {
        title: 'Scheduled movements',
        value: String(upcomingCount),
        detail: 'Upcoming partner deliveries',
        icon: '⇄',
        color: 'blue',
      },
    ];
  }

  private generateRecentOrders(): void {
    this.recentOrders = [...this.allOrders]
      .sort((a, b) => this.getTimestamp(b.createdAt) - this.getTimestamp(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        id: order.orderId || order.id || 'N/A',
        partner: order.partnerName || 'Unknown Partner',
        material: order.silkType || 'Silk',
        quantity: `${this.formatQuantity(Number(order.quantity || 0))} kg`,
        requested: this.formatDate(order.deliveryDate),
        status: order.status || 'Pending Review',
      }));
  }

  private generateUpcomingMovements(): void {
    this.upcomingMovements = this.getUpcomingOrders()
      .slice(0, 5)
      .map(order => {
        const date = this.parseDate(order.deliveryDate)!;

        return {
          day: date.toLocaleDateString('en-PH', { day: '2-digit' }),
          weekday: date.toLocaleDateString('en-PH', { weekday: 'short' }).toUpperCase(),
          title: order.partnerName || 'Partner Delivery',
          description: `Delivery · ${this.formatQuantity(Number(order.quantity || 0))} kg ${order.silkType || 'silk'}`,
          time: 'Date only',
        };
      });
  }

  private generateAlerts(): void {
    const pendingOrders = this.allOrders.filter(
      order => order.status === 'Pending Review'
    );

    const pendingProductions = this.allProductions.filter(
      production => production.status === 'Pending Review'
    );

    this.alerts = [];

    if (pendingOrders.length > 0) {
      this.alerts.push({
        icon: '▣',
        title: `${pendingOrders.length} order${pendingOrders.length > 1 ? 's' : ''} awaiting review`,
        description: pendingOrders.slice(0, 2).map(order => order.orderId || order.id).join(' · '),
        action: 'Review partner orders',
        type: 'green',
        link: '/staff/silk-orders',
      });
    }

    if (pendingProductions.length > 0) {
      const farmerNames = [...new Set(
        pendingProductions.slice(0, 2).map(production => production.farmerName || 'Farmer')
      )];

      this.alerts.push({
        icon: '♧',
        title: `${pendingProductions.length} farmer production record${pendingProductions.length > 1 ? 's' : ''} awaiting confirmation`,
        description: farmerNames.join(' and '),
        action: 'Review farmer production',
        type: 'teal',
        link: '/staff/farmer-production',
      });
    }
  }

  private getUpcomingOrders(): SilkOrder[] {
    const today = this.getTodayStart();

    return this.allOrders
      .filter(order => {
        if (order.status === 'Delivered' || order.status === 'Rejected') {
          return false;
        }

        const deliveryDate = this.parseDate(order.deliveryDate);

        return !!deliveryDate && deliveryDate >= today;
      })
      .sort((a, b) =>
        this.parseDate(a.deliveryDate)!.getTime() -
        this.parseDate(b.deliveryDate)!.getTime()
      );
  }

  private getTodayStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;

    let date: Date;

    if (typeof value?.toDate === 'function') {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(value);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  private getTimestamp(value: any): number {
    return this.parseDate(value)?.getTime() || 0;
  }

  private formatDate(value: any): string {
    const date = this.parseDate(value);

    return date
      ? date.toLocaleDateString('en-PH', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Not specified';
  }

  private formatQuantity(value: number): string {
    return value.toLocaleString('en-PH', {
      maximumFractionDigits: 2,
    });
  }

  getBarHeight(value: number): number {
    return (value / 160) * 100;
  }
}
