
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Search,
  Filter,
  CalendarDays,
  Users,
  MapPin,
  Eye,
  RefreshCw,
  Sprout,
  Info,
  Leaf,
  Scissors,
   Flag,
  BadgeCheck
} from 'lucide-angular';

import {
  FarmerAccount,
  FarmerAccountService
} from '../../../services/farmer-account.service';

import {
  MulberryProductionService,
  MulberryPruningRecord
} from '../../../services/mulberry-production.service';

interface PruningDateEntry {
  farmer: FarmerAccount;
  record: MulberryPruningRecord;
}

@Component({
  selector: 'app-pruning-date-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        ArrowLeft,
        Search,
        Filter,
        CalendarDays,
        Users,
        MapPin,
        Eye,
        RefreshCw,
        Sprout,
        Info,
        Leaf,
        Scissors,
         Flag,
        BadgeCheck
      })
    }
  ],
  templateUrl: './pruning-date-details.html',
  styleUrl: './pruning-date-details.css'
})
export class PruningDateDetails implements OnInit {
  selectedDate = '';

  farmers: FarmerAccount[] = [];
  pruningRecords: MulberryPruningRecord[] = [];
  entries: PruningDateEntry[] = [];

  searchTerm = '';
  selectedStatus = 'All';

  isLoading = false;
  errorMessage = '';

  // Farmer details modal state
  selectedEntry: PruningDateEntry | null = null;
  showDetailsModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private farmerAccountService: FarmerAccountService,
    private mulberryService: MulberryProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.selectedDate = this.route.snapshot.paramMap.get('date') || '';

    if (!this.parseDateOnly(this.selectedDate)) {
      this.errorMessage = 'The selected pruning date is invalid.';
      return;
    }

    void this.loadDateDetails();
  }

  async loadDateDetails(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    Swal.fire({
      title: 'Loading Pruning Details',
      text: 'Retrieving farmer pruning records...',
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

      this.buildDateEntries();
    } catch (error) {
      console.error('Error loading pruning date details:', error);

      this.errorMessage =
        'Unable to load farmer pruning details. Please check your connection and Firebase permissions.';
    } finally {
      this.isLoading = false;
      Swal.close();
      this.cdr.detectChanges();
    }
  }

  private buildDateEntries(): void {
    const farmerMap = new Map<string, FarmerAccount>();

    this.farmers.forEach(farmer => {
      if (farmer.authUid) {
        farmerMap.set(farmer.authUid, farmer);
      }
    });

    const matchingEntries: PruningDateEntry[] = [];

    this.pruningRecords.forEach(record => {
      const recordStartDate = (
        record.startDate || record.pruningDate || ''
      ).substring(0, 10);

      if (recordStartDate !== this.selectedDate) return;

      const farmer = farmerMap.get(record.farmerUid);

      if (!farmer) return;

      matchingEntries.push({
        farmer,
        record
      });
    });

    this.entries = matchingEntries.sort((a, b) =>
      (a.farmer.fullName || '').localeCompare(b.farmer.fullName || '')
    );
  }

  get filteredEntries(): PruningDateEntry[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.entries.filter(entry => {
      const farmer = entry.farmer;
      const status = entry.record.status || 'In Progress';

      const matchesStatus =
        this.selectedStatus === 'All' ||
        status === this.selectedStatus;

      const searchableText = [
        farmer.fullName,
        farmer.farmName,
        farmer.locality,
        farmer.phone,
        farmer.email
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      return matchesStatus && matchesSearch;
    });
  }

  get totalFarmers(): number {
    return new Set(
      this.entries.map(entry => entry.farmer.authUid)
    ).size;
  }

  get activeFarmers(): number {
    return new Set(
      this.entries
        .filter(entry => entry.record.status === 'In Progress')
        .map(entry => entry.farmer.authUid)
    ).size;
  }

  get completedFarmers(): number {
    return new Set(
      this.entries
        .filter(entry => entry.record.status === 'Completed')
        .map(entry => entry.farmer.authUid)
    ).size;
  }

  get formattedSelectedDate(): string {
    const date = this.parseDateOnly(this.selectedDate);

    if (!date) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getRecordStartDate(record: MulberryPruningRecord): string {
    return (
      record.startDate ||
      record.pruningDate ||
      ''
    ).substring(0, 10);
  }

  getRecordEndDate(record: MulberryPruningRecord): string {
    if (record.endDate) {
      return record.endDate.substring(0, 10);
    }

    const startDate = this.getRecordStartDate(record);
    const start = this.parseDateOnly(startDate);

    if (!start) return '';

    start.setDate(start.getDate() + (record.cycleDays || 45));

    return this.formatDate(start);
  }

  getRemainingDays(record: MulberryPruningRecord): number | null {
    if (record.status === 'Completed') return null;

    const endDate = this.getRecordEndDate(record);
    const end = this.parseDateOnly(endDate);
    const today = this.parseDateOnly(this.getTodayDate());

    if (!end || !today) return null;

    const difference =
      Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    return Math.round(difference / 86400000);
  }

  getRemainingLabel(record: MulberryPruningRecord): string {
    if (record.status === 'Completed') {
      return 'Cycle completed';
    }

    const remaining = this.getRemainingDays(record);

    if (remaining === null) return 'Not available';
    if (remaining < 0) return 'Past end date';
    if (remaining === 0) return 'Ends today';
    if (remaining === 1) return '1 day left';

    return `${remaining} days left`;
  }

  getStatusClass(record: MulberryPruningRecord): string {
    return record.status === 'Completed'
      ? 'completed'
      : 'in-progress';
  }

  // Opens the farmer details modal in the HTML template.
  viewFarmerDetails(entry: PruningDateEntry): void {
    this.selectedEntry = entry;
    this.showDetailsModal = true;
  }

  // Closes the farmer details modal.
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedEntry = null;
  }

  // Modal helper: returns the pruning cycle duration.
  getCycleDays(entry: PruningDateEntry): number {
    return entry.record.cycleDays || 45;
  }

  // Modal helper: formats a date for display.
  formatDisplayDate(value: string): string {
    const date = this.parseDateOnly(value);

    return date
      ? date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Not available';
  }

  // Modal helper: returns the current cycle status text.
  getCycleRemainingText(entry: PruningDateEntry): string {
    const record = entry.record;

    if (record.status === 'Completed') {
      return 'Cycle completed';
    }

    const remaining = this.getRemainingDays(record);

    if (remaining === null) return 'Not available';
    if (remaining < 0) return 'Past end date';
    if (remaining === 0) return 'Ends today';

    return `${remaining} ${remaining === 1 ? 'day' : 'days'} remaining`;
  }

  // Modal helper: calculates the estimated cycle progress.
  getCycleProgress(entry: PruningDateEntry): number {
    const record = entry.record;

    if (record.status === 'Completed') return 100;

    const cycleDays = this.getCycleDays(entry);
    const remaining = this.getRemainingDays(record);

    if (remaining === null) return 0;

    const progress = ((cycleDays - remaining) / cycleDays) * 100;

    return Math.round(
      Math.min(100, Math.max(0, progress))
    );
  }

  // Modal helper: checks whether the pruning cycle is completed.
  isCycleCompleted(entry: PruningDateEntry): boolean {
    return entry.record.status === 'Completed';
  }

  goBack(): void {
    void this.router.navigate([
      '/staff/mulberry-production-monitoring'
    ]);
  }

  retryLoading(): void {
    void this.loadDateDetails();
  }

  private getTodayDate(): string {
    return this.formatDate(new Date());
  }

  private parseDateOnly(value: string): Date | null {
    if (!value) return null;

    const parts = value.substring(0, 10).split('-').map(Number);

    if (
      parts.length !== 3 ||
      parts.some(part => !Number.isFinite(part))
    ) {
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
}
