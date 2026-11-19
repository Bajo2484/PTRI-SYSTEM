import { RouterModule } from '@angular/router';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule, UserRound, Sprout, ClipboardList, Package, CheckCircle2,
  Clock3, Plus, ArrowRight, ChevronRight, CalendarDays, Leaf, ChevronLeft,
  Scissors, Truck, Bug, Layers, ShoppingBasket, CalendarCheck
} from 'lucide-angular';
import { getAuth } from 'firebase/auth';
import { FarmerProductionService, FarmerProductionRecord } from '../../services/farmer-production.service';
import { FarmerAccountService, FarmerAccount } from '../../services/farmer-account.service';

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

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css'
})
export class FarmerDashboard implements OnInit {
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

  farmerProfile: FarmerAccount | null = null;
  productions: FarmerProductionRecord[] = [];
  isLoading = true;
  loadError = '';
  today: Date = new Date();

  // Initial calendar month: November 2026
  currentMonth = new Date(2026, 10, 1);
  selectedDate = new Date(2026, 10, 5);

  readonly sampleBatch = {
    batchId: 'SB-DEMO-001',
    silkwormCount: 5000,
    boxCount: 10,
    hatchDate: 'Sample date',
    currentStage: '3rd Instar',
    expectedHarvest: 'To be scheduled',
    status: 'Demo Only'
  };

  // Hard-coded demonstration activities only; replace with PTRI-confirmed records later.
  readonly calendarActivities: CalendarActivity[] = [
    { date: '2026-11-05', title: 'Mulberry Pruning', description: 'Prepare mulberry plants for healthy new leaf growth.', schedule: 'Sample schedule', stage: 'Farm Preparation', icon: Scissors, color: 'green' },
    { date: '2026-11-10', title: 'Mulberry Care', description: 'Inspect the mulberry plants and monitor new shoots.', schedule: 'Sample schedule', stage: 'Farm Care', icon: Sprout, color: 'brown' },
    { date: '2026-11-15', title: 'Leaf Readiness', description: 'Check whether mulberry leaves are ready for silkworm feeding.', schedule: 'Sample schedule', stage: 'Leaf Preparation', icon: Leaf, color: 'gold' },
    { date: '2026-11-20', title: 'Silkworm Delivery', description: 'Receive the approved silkworm batch from PTRI.', schedule: 'Sample schedule', stage: 'Batch Receiving', icon: Truck, color: 'green' },
    { date: '2026-11-22', title: 'Silkworm Rearing', description: 'Monitor silkworm growth and provide suitable mulberry leaves.', schedule: 'Sample schedule', stage: 'Rearing', icon: Bug, color: 'brown' },
    { date: '2026-11-27', title: 'Mounting', description: 'Prepare mature silkworms for cocoon formation.', schedule: 'Sample schedule', stage: 'Cocoon Formation', icon: Layers, color: 'gold' },
    { date: '2026-11-30', title: 'Cocoon Harvest', description: 'Prepare and record harvested cocoons for delivery.', schedule: 'Sample schedule', stage: 'Harvest', icon: ShoppingBasket, color: 'green' }
  ];

  constructor(
    private productionService: FarmerProductionService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        this.loadError = 'Please log in to view your dashboard.';
        return;
      }

      const farmers = await this.farmerAccountService.getFarmers();
      const matchedFarmer = farmers.find(farmer => farmer.authUid === currentUser.uid);
      this.farmerProfile = matchedFarmer ?? null;

      if (!this.farmerProfile) {
        this.loadError = 'Your farmer account could not be found.';
        return;
      }

      this.productions = await this.productionService.getFarmerProductions(currentUser.uid);
    } catch (error) {
      console.error('Error loading farmer dashboard:', error);
      this.loadError = 'Unable to load dashboard data. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get totalProduction(): number {
    return this.productions.reduce((total, record) => total + Number(record.quantity || 0), 0);
  }

  get totalRecords(): number {
    return this.productions.length;
  }

  get pendingReviewCount(): number {
    return this.productions.filter(record => record.status === 'Pending Review').length;
  }

  get reviewedCount(): number {
    return this.productions.filter(record => record.status === 'Reviewed').length;
  }

  get latestProduction(): FarmerProductionRecord | null {
    return this.productions.length > 0 ? this.productions[0] : null;
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

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
        activities: this.calendarActivities.filter(activity => activity.date === key)
      });
    }
    return days;
  }

  get selectedActivities(): CalendarActivity[] {
    const key = this.dateKey(this.selectedDate);
    return this.calendarActivities.filter(activity => activity.date === key);
  }

  get selectedDateLabel(): string {
    return this.selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  goToToday(): void {
    this.currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.selectedDate = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = new Date(day.date);
    if (!day.inCurrentMonth) {
      this.currentMonth = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
    }
  }

 trackByDate(index: number, item: any): any {
  return item?.date ?? item?.id ?? index;
}
}