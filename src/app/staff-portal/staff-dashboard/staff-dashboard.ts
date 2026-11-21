
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SilkOrderService, SilkOrder } from '../../services/silk-order.service';
import { FarmerProductionService, FarmerProductionRecord } from '../../services/farmer-production.service';
import { MulberryProductionService, MulberryPruningRecord } from '../../services/mulberry-production.service';
import { FarmerAccountService, FarmerAccount } from '../../services/farmer-account.service';
import { CocoonProductionService, CocoonReturnRecord } from '../../services/cocoon-production.service';

interface CalendarEvent {
  id: string;
  date: string;
  type: 'pruning' | 'delivery';
  label: string;
  title: string;
  description: string;
  status: string;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

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
  allPruningRecords: MulberryPruningRecord[] = [];
  allFarmers: FarmerAccount[] = [];
  allCocoonReturns: CocoonReturnRecord[] = [];

  isLoading = true;

  today = this.getTodayStart();

  todayLabel = this.today.toLocaleDateString('en-PH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  productionGraphYear = this.today.getFullYear();
  currentMonthIndex = this.today.getMonth();

  monthlyProduction: { month: string; quantity: number }[] = [];
  monthlyAxisLabels: number[] = [0, 0, 0, 0, 0];

  stats = [
    { title: 'Active partner orders', value: '0', detail: 'Loading order records...', icon: '▣', color: 'teal' },
    { title: 'Pending Order Reviews', value: '0', detail: 'Awaiting staff review', icon: '◷', color: 'orange' },
    { title: 'Cocoon stock received', value: '0 kg', detail: '0 kg received · 0 kg submitted', icon: '♧', color: 'green' },
    { title: 'Scheduled movements', value: '0', detail: 'Upcoming partner deliveries', icon: '⇄', color: 'blue' },
  ];

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

  // OPERATIONS CALENDAR
  calendarMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  calendarDays: CalendarDay[] = [];
  calendarEvents: CalendarEvent[] = [];
  selectedDate = this.getDateKey(this.today);
  selectedDateEvents: CalendarEvent[] = [];

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  constructor(
    private silkOrderService: SilkOrderService,
    private farmerProductionService: FarmerProductionService,
    private mulberryProductionService: MulberryProductionService,
    private farmerAccountService: FarmerAccountService,
    private cocoonProductionService: CocoonProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;

    try {
      const [
        orders,
        productions,
        pruningRecords,
        farmers,
        cocoonReturns
      ] = await Promise.all([
        this.silkOrderService.getAllOrders(),
        this.farmerProductionService.getAllProductions(),
        this.mulberryProductionService.getAllPruningRecords(),
        this.farmerAccountService.getFarmers(),
        this.cocoonProductionService.getAllReturnRecordsForStaff(),
      ]);

      this.allOrders = orders || [];
      this.allProductions = productions || [];
      this.allPruningRecords = pruningRecords || [];
      this.allFarmers = farmers || [];
      this.allCocoonReturns = cocoonReturns || [];

      this.generateDashboardStats();
      this.generateMonthlyProductionGraph();
      this.generateRecentOrders();
      this.generateUpcomingMovements();
      this.generateCalendarEvents();
      this.buildCalendarGrid();

    } catch (error) {
      console.error('Error loading staff dashboard data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // MONTHLY EXPECTED COCOON OUTPUT GRAPH
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

      return { month, quantity: total };
    });

    const maxQuantity = Math.max(
      ...this.monthlyProduction.map(item => item.quantity),
      0
    );

    const axisMaximum = maxQuantity > 0
      ? Math.ceil(maxQuantity / 4) * 4
      : 4;

    this.monthlyAxisLabels = [
      axisMaximum,
      axisMaximum * 0.75,
      axisMaximum * 0.5,
      axisMaximum * 0.25,
      0
    ];
  }

  getMonthlyProductionBarHeight(quantity: number): number {
    const axisMaximum = this.monthlyAxisLabels[0] || 0;

    if (axisMaximum <= 0 || quantity <= 0) {
      return 0;
    }

    return Math.max((quantity / axisMaximum) * 100, 3);
  }

  // DASHBOARD SUMMARY
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

   const submittedReturns = this.allCocoonReturns.filter(
  record => record.status === 'Submitted'
);

const receivedWeight = submittedReturns.reduce(
  (total, record) => {
    const weight = Number(
      record.actualReceivedWeight ?? record.cocoonWeight ?? 0
    );

    return total + (Number.isFinite(weight) ? weight : 0);
  },
  0
);

    

    const submittedWeight = submittedReturns.reduce(
      (total, record) =>
        total + Number(record.cocoonWeight || 0),
      0
    );

    const upcomingCount = this.getUpcomingOrders().length;

    this.stats = [
      {
        title: 'Active partner orders',
        value: String(activeOrders.length),
        detail: `${this.formatQuantity(totalRequested)} kg requested`,
        icon: '▣',
        color: 'teal',
      },
      {
        title: 'Pending Order Reviews',
        value: String(pendingOrders.length),
        detail: 'Partner orders awaiting review',
        icon: '◷',
        color: 'orange',
      },
      {
        title: 'Cocoon stock received',
        value: `${this.formatQuantity(receivedWeight)} kg`,
        detail: `${this.formatQuantity(receivedWeight)} kg received · ${this.formatQuantity(submittedWeight)} kg submitted`,
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

  // BUILD CALENDAR EVENTS FROM ACTUAL FIRESTORE RECORDS
  private generateCalendarEvents(): void {
    const events: CalendarEvent[] = [];

    this.allPruningRecords.forEach((record, index) => {
      const startDate = this.parseDate(record.startDate || record.pruningDate);

      if (!startDate) return;

      const farmer = this.allFarmers.find(item =>
        item.authUid === record.farmerUid ||
        item.id === record.farmerUid
      );

      const farmerName = farmer?.fullName || 'Unknown Farmer';
      const pruningStatus = record.status || 'Not specified';

      let endDate = this.parseDate(record.endDate);

      if (!endDate) {
        endDate = new Date(startDate);
        endDate.setDate(
          endDate.getDate() + Number(record.cycleDays || 45)
        );
      }

      const recordId = record.id || `pruning-${index}`;

      events.push({
        id: `${recordId}-start`,
        date: this.getDateKey(startDate),
        type: 'pruning',
        label: `Start · ${farmerName}`,
        title: 'Start Pruning',
        description: `Farmer: ${farmerName}`,
        status: pruningStatus,
      });

      events.push({
        id: `${recordId}-end`,
        date: this.getDateKey(endDate),
        type: 'pruning',
        label: `End · ${farmerName}`,
        title: 'End Pruning',
        description: `Farmer: ${farmerName}`,
        status: pruningStatus,
      });
    });

    this.allOrders.forEach((order, index) => {
      const deliveryDate = this.parseDate(order.deliveryDate);

      if (!deliveryDate) return;

      events.push({
        id: `delivery-${order.id || order.orderId || index}`,
        date: this.getDateKey(deliveryDate),
        type: 'delivery',
        label: `Delivery · ${order.partnerName || 'Partner'}`,
        title: 'Partner Delivery',
        description: `${order.partnerName || 'Unknown Partner'} · ${this.formatQuantity(Number(order.quantity || 0))} kg ${order.silkType || 'silk'}`,
        status: order.status || 'Not specified',
      });
    });

    this.calendarEvents = events;
    this.updateSelectedDateEvents();
  }

  // CALENDAR MONTH NAVIGATION
  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-PH', {
      month: 'long',
      year: 'numeric',
    });
  }

  previousCalendarMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() - 1,
      1
    );

    this.buildCalendarGrid();
  }

  nextCalendarMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() + 1,
      1
    );

    this.buildCalendarGrid();
  }

  goToToday(): void {
    this.calendarMonth = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      1
    );

    this.selectCalendarDate(this.getDateKey(this.today));
  }

  private buildCalendarGrid(): void {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    const gridStart = new Date(year, month, 1 - mondayOffset);

    const eventsByDate = new Map<string, CalendarEvent[]>();

    this.calendarEvents.forEach(event => {
      const existing = eventsByDate.get(event.date) || [];
      existing.push(event);
      eventsByDate.set(event.date, existing);
    });

    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      const dateKey = this.getDateKey(date);

      return {
        date,
        dateKey,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday: dateKey === this.getDateKey(this.today),
        isSelected: dateKey === this.selectedDate,
        events: eventsByDate.get(dateKey) || [],
      };
    });

    this.updateSelectedDateEvents();
  }

  selectCalendarDate(dateKey: string): void {
    this.selectedDate = dateKey;

    this.calendarDays = this.calendarDays.map(day => ({
      ...day,
      isSelected: day.dateKey === dateKey,
    }));

    this.updateSelectedDateEvents();
  }

  private updateSelectedDateEvents(): void {
    this.selectedDateEvents = this.calendarEvents.filter(
      event => event.date === this.selectedDate
    );
  }

  get selectedDateLabel(): string {
    const date = this.parseDate(this.selectedDate);

    return date
      ? date.toLocaleDateString('en-PH', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
  }

  // DATE HELPERS
  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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
}
