
import { RouterModule } from '@angular/router';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  LucideAngularModule,
  UserRound,
  Sprout,
  ClipboardList,
  Package,
  CheckCircle2,
  Clock3,
  Plus,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  Leaf,
  ChevronLeft,
  Scissors,
  Truck,
  Bug,
  Layers,
  ShoppingBasket,
  CalendarCheck
} from 'lucide-angular';

import { getAuth } from 'firebase/auth';

import {
  CocoonProductionService,
  CocoonHarvestRecord
} from '../../services/cocoon-production.service';

import {
  FarmerAccountService,
  FarmerAccount
} from '../../services/farmer-account.service';

// =====================================
// CALENDAR INTERFACES
// =====================================

interface CalendarActivity {
  title: string;
  description: string;
  schedule: string;
  stage: string;
  date: string;
  icon: any;
  color: 'green' | 'gold' | 'brown';
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  activities: CalendarActivity[];
}

// =====================================
// FARMER DASHBOARD
// =====================================

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RouterModule
  ],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css'
})
export class FarmerDashboard implements OnInit {

  // =====================================
  // ICONS
  // =====================================

  readonly UserRound = UserRound;
  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly Clock3 = Clock3;
  readonly Plus = Plus;
  readonly ArrowRight = ArrowRight;
  readonly ChevronRight = ChevronRight;
  readonly ChevronLeft = ChevronLeft;
  readonly CalendarDays = CalendarDays;
  readonly Leaf = Leaf;
  readonly CalendarCheck = CalendarCheck;
  readonly Bug = Bug;

  // =====================================
  // FARMER INFORMATION
  // =====================================

  farmerProfile: FarmerAccount | null = null;

  // Actual cocoon harvest records
  harvestRecords: CocoonHarvestRecord[] = [];

  isLoading = true;
  loadError = '';

  today: Date = new Date();

  // =====================================
  // CALENDAR CONFIGURATION
  // =====================================

  currentMonth = new Date(2026, 10, 1);
  selectedDate = new Date(2026, 10, 5);

  // Schedule modal
  isScheduleModalOpen = false;

  // =====================================
  // SAMPLE SILKWORM BATCH
  // =====================================

  readonly sampleBatch = {
    batchId: 'SB-DEMO-001',
    silkwormCount: 5000,
    boxCount: 10,
    hatchDate: 'Sample date',
    currentStage: '3rd Instar',
    expectedHarvest: 'To be scheduled',
    status: 'Demo Only'
  };

  // =====================================
  // SAMPLE CALENDAR ACTIVITIES
  // Replace with actual PTRI schedules
  // when available.
  // =====================================

  readonly calendarActivities: CalendarActivity[] = [

    {
      date: '2026-11-05',
      title: 'Mulberry Pruning',
      description: 'Prepare mulberry plants for healthy new leaf growth.',
      schedule: 'Sample schedule',
      stage: 'Farm Preparation',
      icon: Scissors,
      color: 'green'
    },

    {
      date: '2026-11-10',
      title: 'Mulberry Care',
      description: 'Inspect the mulberry plants and monitor new shoots.',
      schedule: 'Sample schedule',
      stage: 'Farm Care',
      icon: Sprout,
      color: 'brown'
    },

    {
      date: '2026-11-15',
      title: 'Leaf Readiness',
      description: 'Check whether mulberry leaves are ready for silkworm feeding.',
      schedule: 'Sample schedule',
      stage: 'Leaf Preparation',
      icon: Leaf,
      color: 'gold'
    },

    {
      date: '2026-11-20',
      title: 'Silkworm Delivery',
      description: 'Receive the approved silkworm batch from PTRI.',
      schedule: 'Sample schedule',
      stage: 'Batch Receiving',
      icon: Truck,
      color: 'green'
    },

    {
      date: '2026-11-22',
      title: 'Silkworm Rearing',
      description: 'Monitor silkworm growth and provide suitable mulberry leaves.',
      schedule: 'Sample schedule',
      stage: 'Rearing',
      icon: Bug,
      color: 'brown'
    },

    {
      date: '2026-11-27',
      title: 'Mounting',
      description: 'Prepare mature silkworms for cocoon formation.',
      schedule: 'Sample schedule',
      stage: 'Cocoon Formation',
      icon: Layers,
      color: 'gold'
    },

    {
      date: '2026-11-30',
      title: 'Cocoon Harvest',
      description: 'Prepare and record harvested cocoons for delivery.',
      schedule: 'Sample schedule',
      stage: 'Harvest',
      icon: ShoppingBasket,
      color: 'green'
    }

  ];

  // =====================================
  // CONSTRUCTOR
  // =====================================

  constructor(
    private cocoonProductionService: CocoonProductionService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  // =====================================
  // INITIALIZATION
  // =====================================

  ngOnInit(): void {
    this.loadDashboard();
  }

  // =====================================
  // LOAD FARMER DASHBOARD INFORMATION
  // =====================================

  async loadDashboard(): Promise<void> {

    this.isLoading = true;
    this.loadError = '';

    try {

      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        this.loadError = 'Please log in to view your dashboard.';
        return;
      }

      // Load farmer account information
      const farmers = await this.farmerAccountService.getFarmers();

      const matchedFarmer = farmers.find(
        farmer => farmer.authUid === currentUser.uid
      );

      this.farmerProfile = matchedFarmer ?? null;

      if (!this.farmerProfile) {
        this.loadError = 'Your farmer account could not be found.';
        return;
      }

      // Load the same harvest records used by Cocoon Production
      this.harvestRecords =
        await this.cocoonProductionService.getFarmerHarvestRecords(
          currentUser.uid
        );

    } catch (error) {

      console.error('Error loading farmer dashboard:', error);

      this.loadError =
        'Unable to load dashboard data. Please try again.';

    } finally {

      this.isLoading = false;
      this.cdr.detectChanges();

    }
  }

  // =====================================
  // TOTAL COCOON PRODUCTION
  // Uses harvestedWeight from cocoon-harvests
  // =====================================

  get totalCocoonProduction(): number {

    return this.harvestRecords.reduce(
      (total, record) =>
        total + Number(record.harvestedWeight || 0),
      0
    );

  }

  // =====================================
  // TOTAL HARVEST RECORDS
  // =====================================

  get totalRecords(): number {
    return this.harvestRecords.length;
  }

  // =====================================
  // PENDING COCOON RETURNS
  // =====================================

  get pendingReviewCount(): number {

    return this.harvestRecords.filter(
      record => record.returnStatus === 'Pending Return'
    ).length;

  }

  // =====================================
  // COMPLETED COCOON RETURNS
  // =====================================

  get reviewedCount(): number {

    return this.harvestRecords.filter(
      record =>
        record.returnStatus === 'Submitted' ||
        record.returnStatus === 'Received'
    ).length;

  }

  // =====================================
  // LATEST HARVEST RECORD
  // =====================================

  get latestProduction(): CocoonHarvestRecord | null {

    return this.harvestRecords.length > 0
      ? this.harvestRecords[0]
      : null;

  }

  // =====================================
  // CALENDAR MONTH LABEL
  // =====================================

  get monthLabel(): string {

    return this.currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

  }

  // =====================================
  // GENERATE CALENDAR DAYS
  // =====================================

  get calendarDays(): CalendarDay[] {

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const totalCells = Math.ceil((firstDay + totalDays) / 7) * 7;

    const days: CalendarDay[] = [];

    for (let i = 0; i < totalCells; i++) {

      const date = new Date(year, month, i - firstDay + 1);

      const key = this.dateKey(date);

      days.push({

        date,

        dayNumber: date.getDate(),

        inCurrentMonth: date.getMonth() === month,

        isToday: key === this.dateKey(this.today),

        isSelected: key === this.dateKey(this.selectedDate),

        activities: this.calendarActivities.filter(
          activity => activity.date === key
        )

      });

    }

    return days;
  }

  // =====================================
  // SELECTED DATE ACTIVITIES
  // =====================================

  get selectedActivities(): CalendarActivity[] {

    const key = this.dateKey(this.selectedDate);

    return this.calendarActivities.filter(
      activity => activity.date === key
    );

  }

  // =====================================
  // SELECTED DATE LABEL
  // =====================================

  get selectedDateLabel(): string {

    return this.selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

  }

  // =====================================
  // DATE FORMAT: YYYY-MM-DD
  // =====================================

  private dateKey(date: Date): string {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;

  }

  // =====================================
  // PREVIOUS CALENDAR MONTH
  // =====================================

  previousMonth(): void {

    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );

  }

  // =====================================
  // NEXT CALENDAR MONTH
  // =====================================

  nextMonth(): void {

    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );

  }

  // =====================================
  // RETURN TO CURRENT MONTH
  // =====================================

  goToToday(): void {

    this.currentMonth = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      1
    );

    this.selectedDate = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      this.today.getDate()
    );

  }

  // =====================================
  // SELECT CALENDAR DATE
  // =====================================

  selectDate(day: CalendarDay): void {

    this.selectedDate = new Date(day.date);

    if (!day.inCurrentMonth) {

      this.currentMonth = new Date(
        day.date.getFullYear(),
        day.date.getMonth(),
        1
      );

    }

    this.isScheduleModalOpen = true;

  }

  // =====================================
  // CLOSE SCHEDULE MODAL
  // =====================================

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
  }

  // =====================================
  // TRACK CALENDAR DATES
  // =====================================

  trackByDate(index: number, item: any): any {
    return item?.date ?? item?.id ?? index;
  }

}
