
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import {
  MulberryProductionService,
  MulberryPruningRecord
} from '../../services/mulberry-production.service';
import { auth } from '../../services/firebase';
import Swal from 'sweetalert2';

interface CalendarDay {
  date: string;
  day: number;
  currentMonth: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
}

@Component({
  selector: 'app-mulberry-production',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mulberry-production.html',
  styleUrl: './mulberry-production.css'
})
export class MulberryProduction implements OnInit, OnDestroy {
  pruningRecords: MulberryPruningRecord[] = [];
  calendarDays: CalendarDay[] = [];
  calendarMonth = new Date();

  farmerUid = '';
  farmerName = 'Farmer';
  loading = false;
  processing = false;

  readonly cycleDays = 45;

  private authUnsubscribe?: Unsubscribe;

  constructor(
    private mulberryService: MulberryProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.generateCalendar();

    this.authUnsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        this.farmerUid = user.uid;
        this.farmerName = user.displayName || 'Farmer';
        await this.loadMulberryData();
      } else {
        this.farmerUid = '';
        this.farmerName = 'Farmer';
        this.pruningRecords = [];
        this.generateCalendar();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
  }

  // Get today's local date in YYYY-MM-DD format.
  getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Convert YYYY-MM-DD into a local Date.
  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Convert Date into YYYY-MM-DD.
  private formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Automatically calculate a date after the given number of days.
  private addDays(value: string, days: number): string {
    const date = this.parseDate(value);
    date.setDate(date.getDate() + days);

    return this.formatDate(date);
  }

  // Calculate the difference between two dates without timezone issues.
  private getDateDifference(start: string, end: string): number {
    const first = this.parseDate(start);
    const second = this.parseDate(end);

    const firstUTC = Date.UTC(
      first.getFullYear(),
      first.getMonth(),
      first.getDate()
    );

    const secondUTC = Date.UTC(
      second.getFullYear(),
      second.getMonth(),
      second.getDate()
    );

    return Math.round((secondUTC - firstUTC) / 86400000);
  }

  // Load the farmer's pruning records from Firestore.
  async loadMulberryData(): Promise<void> {
    if (!this.farmerUid) return;

    this.loading = true;

    try {
      this.pruningRecords =
        await this.mulberryService.getFarmerPruningRecords(this.farmerUid);

      this.pruningRecords.sort((a, b) => {
        const dateA = a.startDate || a.pruningDate || '';
        const dateB = b.startDate || b.pruningDate || '';

        return dateB.localeCompare(dateA);
      });

      this.generateCalendar();

    } catch (error) {
      console.error('Error loading pruning records:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Records',
        text: 'Please try again later.',
        confirmButtonColor: '#238348'
      });

    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Get the currently active pruning cycle.
  get activePruning(): MulberryPruningRecord | undefined {
    return this.pruningRecords.find(
      record => record.status === 'In Progress'
    );
  }

  // Get the most recent pruning record.
  get latestPruning(): MulberryPruningRecord | undefined {
    return [...this.pruningRecords].sort((a, b) => {
      const dateA = a.startDate || a.pruningDate || '';
      const dateB = b.startDate || b.pruningDate || '';

      return dateB.localeCompare(dateA);
    })[0];
  }

  // Use the active cycle first; otherwise use the latest cycle.
  get currentCycleRecord(): MulberryPruningRecord | undefined {
    return this.activePruning || this.latestPruning;
  }

  // Get the current cycle's recorded start date.
  get currentCycleStartDate(): string | null {
    const record = this.currentCycleRecord;

    return record?.startDate || record?.pruningDate || null;
  }

  // Display the latest recorded start date.
  get lastPruningDate(): string | null {
    return this.currentCycleStartDate;
  }

  // Get the automatically calculated or saved end date.
  get nextPruningDate(): string | null {
    const record = this.currentCycleRecord;

    if (!record) return null;

    if (record.endDate) {
      return record.endDate;
    }

    const startDate = record.startDate || record.pruningDate;

    return startDate
      ? this.addDays(startDate, this.cycleDays)
      : null;
  }

  // Automatically calculate the remaining days until End Pruning.
  get daysRemaining(): number | null {
    if (!this.nextPruningDate) return null;

    return Math.max(
      this.getDateDifference(this.getToday(), this.nextPruningDate),
      0
    );
  }

  // Calculate the progress of the 45-day pruning cycle.
  get cycleProgress(): number {
    if (!this.currentCycleStartDate) return 0;

    const elapsed = this.getDateDifference(
      this.currentCycleStartDate,
      this.getToday()
    );

    return Math.min(
      Math.max((elapsed / this.cycleDays) * 100, 0),
      100
    );
  }

  // Determine the current pruning cycle status.
  get cycleStatus(): string {
    if (!this.currentCycleStartDate) return 'Not Started';

    if (this.daysRemaining === 0) {
      return 'Pruning Due';
    }

    if (this.daysRemaining !== null && this.daysRemaining <= 7) {
      return 'Prepare Next Batch';
    }

    return 'Growing';
  }

  // Show PTRI reminder when 7 days or less remain.
  get showPreparationReminder(): boolean {
    return (
      this.daysRemaining !== null &&
      this.daysRemaining <= 7
    );
  }

  // Circular progress indicator style.
  get progressRingStyle(): string {
    return `conic-gradient(#36a852 ${this.cycleProgress}%, #dce8df ${this.cycleProgress}%)`;
  }

  // Start a new pruning cycle using today's date automatically.
  async startPruning(): Promise<void> {
    if (!this.farmerUid || this.processing || this.activePruning) {
      return;
    }

    const today = this.getToday();
    const automaticEndDate = this.addDays(today, this.cycleDays);

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Start Pruning?',
      html: `
        The system will automatically record
        <strong>${this.parseDate(today).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}</strong>
        as your Start Pruning date.

        <br><br>

        Your calculated End Pruning date will be
        <strong>${this.parseDate(automaticEndDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}</strong>.

        <br><br>

        Your 45-day pruning countdown will begin automatically.
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Start Pruning',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#218449'
    });

    if (!confirmation.isConfirmed) return;

    this.processing = true;

    try {
      // The service automatically saves today's date and calculates End Pruning.
      await this.mulberryService.startPruning(this.farmerUid);

      await this.loadMulberryData();

      await Swal.fire({
        icon: 'success',
        title: 'Pruning Started!',
        text: 'Your Start Pruning date has been saved and your automatic 45-day cycle has started.',
        confirmButtonColor: '#218449'
      });

    } catch (error) {
      console.error('Error starting pruning:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Start Pruning',
        text: error instanceof Error ? error.message : 'Please try again.',
        confirmButtonColor: '#218449'
      });

    } finally {
      this.processing = false;
      this.cdr.detectChanges();
    }
  }

  // Get the calculated End Pruning date for a history record.
  getRecordNextDate(record: MulberryPruningRecord): string | null {
    if (record.endDate) {
      return record.endDate;
    }

    const startDate = record.startDate || record.pruningDate;

    return startDate
      ? this.addDays(startDate, this.cycleDays)
      : null;
  }

  // Get the Start Pruning date for a history record.
  getRecordDisplayDate(record: MulberryPruningRecord): string | null {
    return record.startDate || record.pruningDate || null;
  }

  // Navigate to the previous calendar month.
  previousMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() - 1,
      1
    );

    this.generateCalendar();
  }

  // Navigate to the next calendar month.
  nextMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth() + 1,
      1
    );

    this.generateCalendar();
  }

  // Generate the calendar and mark recorded start/end dates.
  generateCalendar(): void {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const calendarStart = new Date(
      year,
      month,
      1 - firstDay.getDay()
    );

    const startDates = new Set(
      this.pruningRecords
        .map(record => record.startDate || record.pruningDate)
        .filter((date): date is string => !!date)
    );

    const endDates = new Set(
      this.pruningRecords
        .map(record => this.getRecordNextDate(record))
        .filter((date): date is string => !!date)
    );

    const today = this.getToday();

    this.calendarDays = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + i);

      const dateString = this.formatDate(date);

      this.calendarDays.push({
        date: dateString,
        day: date.getDate(),
        currentMonth: date.getMonth() === month,
        isToday: dateString === today,
        isStart: startDates.has(dateString),
        isEnd: endDates.has(dateString)
      });
    }
  }
}
