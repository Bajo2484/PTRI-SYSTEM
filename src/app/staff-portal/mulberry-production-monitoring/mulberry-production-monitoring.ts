
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  BellRing,
  Sprout,
  UserRound,
  CheckCircle2,
  Users,
  Clock,
  CalendarCheck,
  Info,
  CalendarDays,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Repeat
} from 'lucide-angular';
import { Router } from '@angular/router';
import { FarmerAccount, FarmerAccountService } from '../../services/farmer-account.service';
import { MulberryProductionService, MulberryPruningRecord } from '../../services/mulberry-production.service';

interface PruningCalendarEntry {
  farmer: FarmerAccount;
  record: MulberryPruningRecord;
}

interface PruningAlertEntry {
  farmer: FarmerAccount;
  record: MulberryPruningRecord;
  remainingDays: number;
}

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  farmerCount: number;
  isEndingSoon: boolean;
  isPruningStart: boolean;
  isPruningEnd: boolean;
}

@Component({
  selector: 'app-mulberry-production-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        BellRing,
        Sprout,
        UserRound,
        CheckCircle2,
        Users,
        Clock,
        CalendarCheck,
        Info,
        CalendarDays,
        AlertCircle,
        ChevronLeft,
        ChevronRight,
        Repeat
      })
    }
  ],
  templateUrl: './mulberry-production-monitoring.html',
  styleUrl: './mulberry-production-monitoring.css'
})
export class MulberryProductionMonitoring implements OnInit {
  farmers: FarmerAccount[] = [];
  pruningRecords: MulberryPruningRecord[] = [];

  calendarDays: CalendarDay[] = [];
  calendarEvents: Record<string, PruningCalendarEntry[]> = {};

  currentMonth = new Date();
  isLoading = false;
  errorMessage = '';

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(
    private farmerAccountService: FarmerAccountService,
    private mulberryService: MulberryProductionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadMonitoring();
  }

  async loadMonitoring(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    Swal.fire({
      title: 'Loading Pruning Calendar',
      text: 'Retrieving farmer pruning schedules...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      const [farmers, records] = await Promise.all([
        this.farmerAccountService.getFarmers(),
        this.mulberryService.getAllPruningRecords()
      ]);

      this.farmers = farmers;
      this.pruningRecords = records;

      this.buildCalendarEvents();
      this.generateCalendar();
    } catch (error) {
      console.error('Error loading pruning calendar:', error);
      this.errorMessage = 'Unable to load pruning schedules. Please check your connection and Firebase permissions.';
    } finally {
      this.isLoading = false;
      Swal.close();
      this.cdr.detectChanges();
    }
  }

  private buildCalendarEvents(): void {
    const farmerMap = new Map<string, FarmerAccount>();

    // Match pruning farmerUid with the farmer's Firebase Auth UID.
    this.farmers.forEach(farmer => {
      if (farmer.authUid) {
        farmerMap.set(farmer.authUid, farmer);
      }
    });

    const grouped: Record<string, PruningCalendarEntry[]> = {};

    this.pruningRecords.forEach(record => {
      const date = record.startDate || record.pruningDate;
      const farmer = farmerMap.get(record.farmerUid);

      if (!date || !farmer) return;

      if (!grouped[date]) {
        grouped[date] = [];
      }

      // Count each farmer only once per date.
      const alreadyAdded = grouped[date].some(
        entry => entry.farmer.authUid === farmer.authUid
      );

      if (!alreadyAdded) {
        grouped[date].push({ farmer, record });
      }
    });

    this.calendarEvents = grouped;
  }

  // Gets the actual end date, with a fallback for older records.
  getRecordEndDate(record: MulberryPruningRecord): string | null {
    if (record.endDate) {
      return record.endDate.substring(0, 10);
    }

    const startDate = record.startDate || record.pruningDate;
    if (!startDate) return null;

    const start = this.parseDateOnly(startDate);
    if (!start) return null;

    const cycleDays = record.cycleDays || 45;
    start.setDate(start.getDate() + cycleDays);

    return this.formatDate(start);
  }

  // Calculates remaining days using calendar dates, not hours.
  getRemainingDays(record: MulberryPruningRecord): number | null {
    const endDate = this.getRecordEndDate(record);
    if (!endDate) return null;

    const end = this.parseDateOnly(endDate);
    const today = this.parseDateOnly(this.getTodayDate());

    if (!end || !today) return null;

    const difference = Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    ) - Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return Math.round(difference / 86400000);
  }

  // Only active cycles ending within five days appear in the alert.
  get pruningAlerts(): PruningAlertEntry[] {
    const farmerMap = new Map<string, FarmerAccount>();

    this.farmers.forEach(farmer => {
      if (farmer.authUid) {
        farmerMap.set(farmer.authUid, farmer);
      }
    });

    const alerts = new Map<string, PruningAlertEntry>();

    this.pruningRecords.forEach(record => {
      if (record.status !== 'In Progress') return;

      const farmer = farmerMap.get(record.farmerUid);
      if (!farmer?.authUid) return;

      const remainingDays = this.getRemainingDays(record);

      if (remainingDays === null || remainingDays < 0 || remainingDays > 5) {
        return;
      }

      const existing = alerts.get(farmer.authUid);

      // Keep the farmer's nearest upcoming pruning end date.
      if (!existing || remainingDays < existing.remainingDays) {
        alerts.set(farmer.authUid, {
          farmer,
          record,
          remainingDays
        });
      }
    });

    return Array.from(alerts.values())
      .sort((a, b) => a.remainingDays - b.remainingDays);
  }

  getAlertText(remainingDays: number): string {
    if (remainingDays === 0) return 'Ends today';
    if (remainingDays === 1) return 'Ends tomorrow';
    return `Ends in ${remainingDays} days`;
  }

  getAlertPriority(remainingDays: number): string {
    if (remainingDays <= 2) return 'urgent';
    return 'warning';
  }

  // Generates the calendar and marks dates with upcoming pruning endings.
  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const previousMonthLastDay = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((startWeekday + totalDays) / 7) * 7;

    const today = this.getTodayDate();
    const days: CalendarDay[] = [];

    for (let index = 0; index < totalCells; index++) {
      let date: Date;
      let isCurrentMonth = true;

      if (index < startWeekday) {
        const day = previousMonthLastDay - startWeekday + index + 1;
        date = new Date(year, month - 1, day);
        isCurrentMonth = false;
      } else if (index >= startWeekday + totalDays) {
        const day = index - (startWeekday + totalDays) + 1;
        date = new Date(year, month + 1, day);
        isCurrentMonth = false;
      } else {
        const day = index - startWeekday + 1;
        date = new Date(year, month, day);
      }

      const dateKey = this.formatDate(date);

      days.push({
        date: dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday: dateKey === today,
        farmerCount: this.calendarEvents[dateKey]?.length || 0,
        isEndingSoon: this.isDateEndingSoon(dateKey),
        isPruningStart: this.isDatePruningStart(dateKey),
        isPruningEnd: this.isDatePruningEnd(dateKey)
      });
    }

    this.calendarDays = days;
  }

  private isDateEndingSoon(date: string): boolean {
    return this.pruningRecords.some(record => {
      if (record.status !== 'In Progress') return false;

      const remainingDays = this.getRemainingDays(record);
      return this.getRecordEndDate(record) === date &&
        remainingDays !== null &&
        remainingDays >= 0 &&
        remainingDays <= 5;
    });
  }

  isDatePruningStart(dateKey: string): boolean {
  return !!this.calendarEvents[dateKey]?.length;
}

isDatePruningEnd(dateKey: string): boolean {
  return this.pruningRecords.some(record => {
    const endDate = this.getRecordEndDate(record);

    if (!endDate) return false;

    return endDate === dateKey;
  });
}

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );

    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );

    this.generateCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.generateCalendar();
  }

  get monthYearLabel(): string {
    return this.currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  openDateDetails(day: CalendarDay): void {
    if (day.farmerCount === 0) return;

    void this.router.navigate([
      '/staff/mulberry-production-monitoring',
      day.date
    ]);
  }

  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  private parseDateOnly(value: string): Date | null {
    const datePart = value.substring(0, 10);
    const parts = datePart.split('-').map(Number);

    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
      return null;
    }

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Total registered farmer accounts.
  get totalPruningFarmers(): number {
    return this.farmers.length;
  }

  // Number of unique farmers with an active pruning cycle.
  get activePruningFarmers(): number {
    const activeUids = new Set(
      this.pruningRecords
        .filter(record => record.status === 'In Progress')
        .map(record => record.farmerUid)
    );

    return activeUids.size;
  }

  // All farmers with an active cycle ending within seven days.
  get nearCompletionFarmers(): number {
    const nearCompletionUids = new Set<string>();

    this.pruningRecords.forEach(record => {
      if (record.status !== 'In Progress') return;

      const remainingDays = this.getRemainingDays(record);

      if (
        remainingDays !== null &&
        remainingDays >= 0 &&
        remainingDays <= 7
      ) {
        nearCompletionUids.add(record.farmerUid);
      }
    });

    return nearCompletionUids.size;
  }

  // Number of completed pruning cycles.
  get completedPruningCycles(): number {
    return this.pruningRecords.filter(
      record => record.status === 'Completed'
    ).length;
  }

  get totalPruningRecords(): number {
    return this.pruningRecords.length;
  }

  get totalScheduledDates(): number {
    return Object.keys(this.calendarEvents).length;
  }

  get currentMonthFarmers(): number {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    return this.calendarDays
      .filter(day => {
        const date = new Date(day.date + 'T00:00:00');

        return day.isCurrentMonth &&
          date.getFullYear() === year &&
          date.getMonth() === month;
      })
      .reduce((total, day) => total + day.farmerCount, 0);
  }

  retryLoading(): void {
    void this.loadMonitoring();
  }
}
