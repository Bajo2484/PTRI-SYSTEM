
import { FormsModule } from '@angular/forms';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import {
  FarmerProductionService,
  ProductionActivityType
} from '../../services/farmer-production.service';

interface ProductionCommitment {
  id: string;
  farmer: string;
  farmName: string;
  productionType: string;
  activityType: ProductionActivityType;
  quantity: number;
  unit?: string;
  harvestDate?: string;
  notes: string;
  reference: string;
  committed: number;
  received: number;
  remaining: number;
  confirmation: 'Reviewed' | 'Pending Review';
  lastUpdate: string;

  // MULBERRY LEAF AVAILABILITY
  availableLeafCount?: number;
  leafReportDate?: string;

  // MULBERRY PRUNING
  pruningDate?: string;
  pruningCycleDays?: number;
  pruningDaysRemaining?: number;

  // SILKWORM REARING
  batchReference?: string;
  hatchDate?: string;
  silkwormCount?: number;
  boxCount?: number;
  instar?: string;
  expectedMountingDate?: string;
  expectedCocoonReturnDate?: string;

  // COCOON HARVEST
  cocoonQuantity?: number;
  cocoonUnit?: string;
  expectedDeliveryDate?: string;
}

@Component({
  selector: 'app-farmers-production',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './farmer-production.html',
  styleUrls: ['./farmer-production.css']
})
export class FarmersProductionComponent implements OnInit {

  constructor(
    private productionService: FarmerProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  isLoading = true;
  loadError = '';

  searchTerm = '';
  selectedConfirmation = 'all';
  harvestSortAscending = true;
  filtersVisible = false;

  commitments: ProductionCommitment[] = [];
  selectedProduction: ProductionCommitment | null = null;

  showReviewModal = false;
  isReviewing = false;

  // ONLY COCOON HARVEST AND LEGACY RECORDS
  // ARE INCLUDED IN THE EXISTING COMMITMENT TOTALS.
  // Leaves and silkworms must not be combined with cocoon quantities.

  private get cocoonCommitments(): ProductionCommitment[] {
    return this.commitments.filter(item =>
      item.activityType === 'cocoon-harvest' ||
      item.activityType === 'legacy'
    );
  }

  get totalCommitted(): number {
    return this.cocoonCommitments.reduce(
      (total, item) => total + item.committed,
      0
    );
  }

  get totalReceived(): number {
    return this.cocoonCommitments.reduce(
      (total, item) => total + item.received,
      0
    );
  }

  get totalRemaining(): number {
    return this.cocoonCommitments.reduce(
      (total, item) => total + item.remaining,
      0
    );
  }

  get awaitingConfirmationCount(): number {
    return this.commitments.filter(
      item => item.confirmation === 'Pending Review'
    ).length;
  }

  get confirmedTotal(): number {
    return this.cocoonCommitments
      .filter(item => item.confirmation === 'Reviewed')
      .reduce((total, item) => total + item.remaining, 0);
  }

  get awaitingTotal(): number {
    return this.cocoonCommitments
      .filter(item => item.confirmation === 'Pending Review')
      .reduce((total, item) => total + item.remaining, 0);
  }

  get receivedPercentage(): number {
    return this.totalCommitted > 0
      ? (this.totalReceived / this.totalCommitted) * 100
      : 0;
  }

  get awaitingFarmers(): ProductionCommitment[] {
    return this.commitments.filter(
      item => item.confirmation === 'Pending Review'
    );
  }

  ngOnInit(): void {
    this.loadProductions();
  }

  // ACTIVITY LABELS
  getActivityLabel(activityType: ProductionActivityType): string {
    const labels: Record<ProductionActivityType, string> = {
      'leaf-availability': 'Mulberry Leaf Availability',
      'mulberry-pruning': 'Mulberry Pruning',
      'silkworm-rearing': 'Silkworm Rearing',
      'cocoon-harvest': 'Cocoon Harvest',
      'legacy': 'Previous Production Record'
    };

    return labels[activityType];
  }

  // PARSE DATE AS LOCAL DATE
  // Prevents timezone shifts for YYYY-MM-DD values.
  private parseLocalDate(dateValue?: string): Date | null {
    if (!dateValue) return null;

    const parts = dateValue.split('-').map(Number);

    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
      return null;
    }

    const [year, month, day] = parts;
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    parsedDate.setHours(0, 0, 0, 0);

    return parsedDate;
  }

  // CALCULATE THE REMAINING DAYS IN THE 45-DAY PRUNING CYCLE
  private getPruningDaysRemaining(
    pruningDate?: string,
    cycleDays: number = 45
  ): number | undefined {
    const startDate = this.parseLocalDate(pruningDate);

    if (!startDate || !Number.isFinite(cycleDays) || cycleDays <= 0) {
      return undefined;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const elapsedDays = Math.floor(
      (today.getTime() - startDate.getTime()) / 86400000
    );

    return Math.max(0, cycleDays - elapsedDays);
  }

  // PTRI PREPARATION REMINDER
  // Notify PTRI when 7 days or fewer remain.
  // This does not automatically schedule silkworm incubation.
  isPruningPreparationDue(record: ProductionCommitment): boolean {
    const remaining = record.pruningDaysRemaining;

    return remaining !== undefined &&
      remaining > 0 &&
      remaining <= 7;
  }

  // CHECK IF THE PRUNING CYCLE IS COMPLETE
  isPruningCycleComplete(record: ProductionCommitment): boolean {
    return record.pruningDaysRemaining === 0;
  }

  // LOAD FARMER PRODUCTION RECORDS
  async loadProductions(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const records = await this.productionService.getAllProductions();

      this.commitments = records.map(record => {
        const activityType: ProductionActivityType =
          record.activityType || 'legacy';

        let quantity = 0;
        let unit = '';
        let harvestDate = '';
        let productionType = record.productionType || '';

        switch (activityType) {

          case 'leaf-availability':
            quantity = Number(record.availableLeafCount || 0);
            unit = 'leaves';
            harvestDate = record.leafReportDate || '';
            productionType = 'Mulberry Leaf Availability';
            break;

          case 'mulberry-pruning':
            quantity = 0;
            unit = '';
            harvestDate = record.pruningDate || '';
            productionType = 'Mulberry Pruning';
            break;

          case 'silkworm-rearing':
            quantity = Number(record.silkwormCount || 0);
            unit = 'silkworms';
            harvestDate = record.hatchDate || '';
            productionType = 'Silkworm Rearing';
            break;

          case 'cocoon-harvest':
            quantity = Number(
              record.cocoonQuantity ?? record.quantity ?? 0
            );
            unit = record.cocoonUnit || record.unit || 'kg';
            harvestDate = record.harvestDate || '';
            productionType = 'Cocoon Harvest';
            break;

          default:
            // Preserve compatibility with older production records.
            quantity = Number(record.quantity || 0);
            unit = record.unit || '';
            harvestDate =
              record.harvestDate ||
              record.expectedAvailability ||
              '';
            productionType =
              record.productionType || 'Previous Production Record';
            break;
        }

        const pruningCycleDays = Number(record.pruningCycleDays || 45);

        return {
          id: record.id || '',
          farmer: record.farmerName || 'Unknown Farmer',
          farmName: record.farmName || 'Unknown Farm',
          productionType,
          activityType,
          quantity,
          unit,
          harvestDate,
          notes: record.notes || '',

          reference: `PRD-${record.id?.slice(0, 6).toUpperCase() || 'NEW'} · ${record.farmName || 'Farm'}`,

          committed: quantity,

          // Placeholder only. This is NOT actual cocoon receiving.
          received: 0,
          remaining: quantity,

          confirmation: record.status === 'Reviewed'
            ? 'Reviewed' as const
            : 'Pending Review' as const,

          lastUpdate:
            record.createdAt &&
            typeof (record.createdAt as any).toDate === 'function'
              ? (record.createdAt as any).toDate().toLocaleDateString()
              : '',

          // LEAF AVAILABILITY DETAILS
          availableLeafCount: record.availableLeafCount,
          leafReportDate: record.leafReportDate,

          // PRUNING DETAILS
          pruningDate: record.pruningDate,
          pruningCycleDays,
          pruningDaysRemaining:
            activityType === 'mulberry-pruning'
              ? this.getPruningDaysRemaining(
                  record.pruningDate,
                  pruningCycleDays
                )
              : undefined,

          // SILKWORM REARING DETAILS
          batchReference: record.batchReference,
          hatchDate: record.hatchDate,
          silkwormCount: record.silkwormCount,
          boxCount: record.boxCount,
          instar: record.instar,
          expectedMountingDate: record.expectedMountingDate,
          expectedCocoonReturnDate: record.expectedCocoonReturnDate,

          // COCOON HARVEST DETAILS
          // harvestDate is already assigned above.
          cocoonQuantity: record.cocoonQuantity,
          cocoonUnit: record.cocoonUnit,
          expectedDeliveryDate: record.expectedDeliveryDate
        };
      });

    } catch (error) {
      console.error('Error loading farmer productions:', error);

      this.loadError =
        'Unable to load farmer production records. Please try again.';

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Production',
        text: this.loadError,
        confirmButtonColor: '#244b38'
      });

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // OPEN REVIEW MODAL
  openReviewModal(commitment: ProductionCommitment): void {
    this.selectedProduction = commitment;
    this.showReviewModal = true;
  }

  // CLOSE REVIEW MODAL
  closeReviewModal(): void {
    if (this.isReviewing) return;

    this.showReviewModal = false;
    this.selectedProduction = null;
  }

  // REVIEW FARMER SUBMISSION
  async reviewProduction(commitment: ProductionCommitment): Promise<void> {
    if (!commitment.id || commitment.confirmation === 'Reviewed') {
      return;
    }

    this.isReviewing = true;

    try {
      await this.productionService.updateProductionStatus(
        commitment.id,
        'Reviewed'
      );

      const farmerName = commitment.farmer;

      this.showReviewModal = false;
      this.selectedProduction = null;

      await this.loadProductions();

      await Swal.fire({
        icon: 'success',
        title: 'Production Reviewed!',
        text: `${farmerName}'s production submission has been confirmed.`,
        confirmButtonColor: '#244b38'
      });

    } catch (error) {
      console.error('Error reviewing production:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Review',
        text: 'Something went wrong while updating the production status.',
        confirmButtonColor: '#244b38'
      });

    } finally {
      this.isReviewing = false;
      this.cdr.detectChanges();
    }
  }

  // FILTER AND SEARCH RECORDS
  get filteredCommitments(): ProductionCommitment[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.commitments
      .filter(commitment => {
        const matchesSearch =
          commitment.farmer.toLowerCase().includes(search) ||
          commitment.farmName.toLowerCase().includes(search) ||
          commitment.reference.toLowerCase().includes(search) ||
          commitment.productionType.toLowerCase().includes(search);

        const matchesConfirmation =
          this.selectedConfirmation === 'all' ||
          (
            this.selectedConfirmation === 'confirmed' &&
            commitment.confirmation === 'Reviewed'
          ) ||
          (
            this.selectedConfirmation === 'awaiting' &&
            commitment.confirmation === 'Pending Review'
          );

        return matchesSearch && matchesConfirmation;
      })
      .sort((a, b) => {
        const dateA = this.parseLocalDate(a.harvestDate)?.getTime() ?? 0;
        const dateB = this.parseLocalDate(b.harvestDate)?.getTime() ?? 0;

        return this.harvestSortAscending
          ? dateA - dateB
          : dateB - dateA;
      });
  }

  // TOGGLE DATE SORT
  toggleHarvestSort(): void {
    this.harvestSortAscending = !this.harvestSortAscending;
  }

  // TOGGLE FILTER PANEL
  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  // COMMUNICATION BUTTON
  openCommunication(): void {
    alert(
      'Open Communication: connect this button to your communication page.'
    );
  }
}
