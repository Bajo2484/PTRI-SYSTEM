
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import {
  Sprout, ClipboardList, Clock3, Plus, Leaf, Info,
  CalendarDays, Package, CheckCircle2, Eye
} from 'lucide-angular';

import { getAuth } from 'firebase/auth';

import {
  FarmerProductionService,
  FarmerProductionRecord,
  ProductionActivityType
} from '../../services/farmer-production.service';

import {
  FarmerAccountService,
  FarmerAccount
} from '../../services/farmer-account.service';

@Component({
  selector: 'app-farmer-production',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-production.html',
  styleUrl: './farmer-production.css',
})
export class FarmerProduction implements OnInit {

  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
  readonly Clock3 = Clock3;
  readonly Plus = Plus;
  readonly Leaf = Leaf;
  readonly Info = Info;
  readonly CalendarDays = CalendarDays;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly Eye = Eye;

  productions: FarmerProductionRecord[] = [];
  farmerProfile: FarmerAccount | null = null;

  isLoading = true;
  isSaving = false;
  loadError = '';
  formError = '';

  showProductionForm = false;

  // SELECTED ACTIVITY
  activityType: ProductionActivityType | '' = '';

  // GENERAL NOTES
  notes = '';

  // MULBERRY LEAF AVAILABILITY
  availableLeafCount: number | null = null;
  leafReportDate = '';

  // MULBERRY PRUNING
  pruningDate = '';

  // SILKWORM REARING
  batchReference = '';
  hatchDate = '';
  silkwormCount: number | null = null;
  boxCount: number | null = null;
  instar = '';
  expectedMountingDate = '';
  expectedCocoonReturnDate = '';

  // COCOON HARVEST
  harvestDate = '';
  cocoonQuantity: number | null = null;
  cocoonUnit = 'kg';
  expectedDeliveryDate = '';

  constructor(
    private productionService: FarmerProductionService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProductions();
  }

  // LOAD FARMER PRODUCTION RECORDS
  async loadProductions(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        this.loadError = 'Please log in to view your production records.';
        return;
      }

      const farmers = await this.farmerAccountService.getFarmers();

      this.farmerProfile =
        farmers.find(farmer => farmer.authUid === currentUser.uid) || null;

      if (!this.farmerProfile) {
        this.loadError = 'Your farmer account could not be found.';
        return;
      }

      this.productions =
        await this.productionService.getFarmerProductions(currentUser.uid);

    } catch (error) {
      console.error('Error loading farmer production:', error);
      this.loadError = 'Unable to load production records. Please try again.';

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // SUMMARY VALUES
  get totalProduction(): number {
    return this.productions.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );
  }

  get totalRecords(): number {
    return this.productions.length;
  }

  get pendingReviewCount(): number {
    return this.productions.filter(
      record => record.status === 'Pending Review'
    ).length;
  }

  // ACTIVITY LABEL
  getActivityLabel(activityType?: ProductionActivityType): string {
    const labels: Record<ProductionActivityType, string> = {
      'leaf-availability': 'Mulberry Leaf Availability',
      'mulberry-pruning': 'Mulberry Pruning',
      'silkworm-rearing': 'Silkworm Rearing',
      'cocoon-harvest': 'Cocoon Harvest',
      'legacy': 'Previous Production Record'
    };

    return labels[activityType || 'legacy'];
  }

  // GET ACTIVITY TYPE FROM OLD OR NEW RECORDS
  getRecordActivityLabel(record: FarmerProductionRecord): string {
    if (record.activityType) {
      return this.getActivityLabel(record.activityType);
    }

    return record.productionType || 'Previous Production Record';
  }

  // OPEN FORM
  openProductionForm(): void {
    this.formError = '';
    this.resetForm();
    this.showProductionForm = true;
  }

  // CLOSE FORM
  closeProductionForm(): void {
    if (this.isSaving) return;

    this.showProductionForm = false;
    this.resetForm();
  }

  // RESET FORM FIELDS
  resetForm(): void {
    this.activityType = '';
    this.notes = '';

    this.availableLeafCount = null;
    this.leafReportDate = '';

    this.pruningDate = '';

    this.batchReference = '';
    this.hatchDate = '';
    this.silkwormCount = null;
    this.boxCount = null;
    this.instar = '';
    this.expectedMountingDate = '';
    this.expectedCocoonReturnDate = '';

    this.harvestDate = '';
    this.cocoonQuantity = null;
    this.cocoonUnit = 'kg';
    this.expectedDeliveryDate = '';

    this.formError = '';
  }

  // SELECTED ACTIVITY VALIDATION
  validateActivity(): boolean {
    if (!this.activityType) {
      this.formError = 'Please select an activity.';
      return false;
    }

    switch (this.activityType) {

      case 'leaf-availability':
        if (
          this.availableLeafCount === null ||
          !Number.isFinite(this.availableLeafCount) ||
          this.availableLeafCount <= 0
        ) {
          this.formError = 'Please enter a valid estimated number of available leaves.';
          return false;
        }

        if (!this.leafReportDate) {
          this.formError = 'Please select the leaf availability report date.';
          return false;
        }
        break;

      case 'mulberry-pruning':
        if (!this.pruningDate) {
          this.formError = 'Please select the date when you pruned your mulberry plants.';
          return false;
        }
        break;

      case 'silkworm-rearing':
        if (!this.hatchDate) {
          this.formError = 'Please select the silkworm hatch date.';
          return false;
        }

        if (
          this.silkwormCount === null ||
          !Number.isFinite(this.silkwormCount) ||
          this.silkwormCount <= 0
        ) {
          this.formError = 'Please enter a valid number of silkworms.';
          return false;
        }

        if (
          this.boxCount === null ||
          !Number.isFinite(this.boxCount) ||
          this.boxCount <= 0
        ) {
          this.formError = 'Please enter a valid number of boxes.';
          return false;
        }

        if (!this.instar.trim()) {
          this.formError = 'Please select the silkworm instar or age.';
          return false;
        }

        if (!this.expectedMountingDate) {
          this.formError = 'Please select the expected mounting date.';
          return false;
        }

        if (!this.expectedCocoonReturnDate) {
          this.formError = 'Please select the expected cocoon return date.';
          return false;
        }
        break;

      case 'cocoon-harvest':
        if (!this.harvestDate) {
          this.formError = 'Please select the cocoon harvest date.';
          return false;
        }

        if (
          this.cocoonQuantity === null ||
          !Number.isFinite(this.cocoonQuantity) ||
          this.cocoonQuantity <= 0
        ) {
          this.formError = 'Please enter a valid cocoon harvest quantity.';
          return false;
        }

        if (!this.expectedDeliveryDate) {
          this.formError = 'Please select the expected delivery date to PTRI.';
          return false;
        }
        break;
    }

    this.formError = '';
    return true;
  }

  // SAVE NEW ACTIVITY RECORD
  async saveProduction(): Promise<void> {

    if (!this.validateActivity()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Information',
        text: this.formError,
        confirmButtonColor: '#477451'
      });
      return;
    }

    const currentUser = getAuth().currentUser;

    if (!currentUser || !this.farmerProfile) {
      this.formError = 'Your farmer account could not be verified.';
      return;
    }

    const activityLabels: Record<Exclude<ProductionActivityType, 'legacy'>, string> = {
      'leaf-availability': 'Mulberry Leaf Availability',
      'mulberry-pruning': 'Mulberry Pruning',
      'silkworm-rearing': 'Silkworm Rearing',
      'cocoon-harvest': 'Cocoon Harvest'
    };

    const productionData: Omit<FarmerProductionRecord, 'id' | 'createdAt'> = {
      farmerUid: currentUser.uid,
      farmerName: this.farmerProfile.fullName,
      farmName: this.farmerProfile.farmName,

      activityType: this.activityType as Exclude<ProductionActivityType, 'legacy'>,
      productionType: activityLabels[
        this.activityType as Exclude<ProductionActivityType, 'legacy'>
      ],

      notes: this.notes.trim(),
      status: 'Pending Review'
    };

    // MULBERRY LEAF AVAILABILITY
    if (this.activityType === 'leaf-availability') {
      productionData.availableLeafCount = this.availableLeafCount!;
      productionData.leafReportDate = this.leafReportDate;
    }

    // MULBERRY PRUNING
    if (this.activityType === 'mulberry-pruning') {
      productionData.pruningDate = this.pruningDate;
      productionData.pruningCycleDays = 45;
    }

    // SILKWORM REARING
    if (this.activityType === 'silkworm-rearing') {
      productionData.batchReference = this.batchReference.trim();
      productionData.hatchDate = this.hatchDate;
      productionData.silkwormCount = this.silkwormCount!;
      productionData.boxCount = this.boxCount!;
      productionData.instar = this.instar;
      productionData.expectedMountingDate = this.expectedMountingDate;
      productionData.expectedCocoonReturnDate = this.expectedCocoonReturnDate;
    }

    // COCOON HARVEST
    if (this.activityType === 'cocoon-harvest') {
      productionData.harvestDate = this.harvestDate;
      productionData.cocoonQuantity = this.cocoonQuantity!;
      productionData.cocoonUnit = this.cocoonUnit;

      // Keep legacy quantity fields populated for compatibility.
      productionData.quantity = this.cocoonQuantity!;
      productionData.unit = this.cocoonUnit;
      productionData.expectedAvailability = this.expectedDeliveryDate;
      productionData.expectedDeliveryDate = this.expectedDeliveryDate;
    }

    this.isSaving = true;
    this.formError = '';

    Swal.fire({
      title: 'Saving Activity...',
      text: 'Please wait while we save your activity record.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
      background: '#ffffff',
      color: '#2d4334'
    });

    try {
      await this.productionService.addProduction(productionData);

      this.showProductionForm = false;
      this.resetForm();

      await this.loadProductions();

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Activity Submitted!',
        text: 'Your activity record has been submitted successfully for PTRI review.',
        confirmButtonText: 'Great!',
        confirmButtonColor: '#477451',
        background: '#ffffff',
        color: '#2d4334',
        timer: 2500,
        timerProgressBar: true
      });

    } catch (error) {
      console.error('Error saving farmer activity:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Save',
        text: 'Something went wrong while saving your activity. Please try again.',
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#477451',
        background: '#ffffff',
        color: '#2d4334'
      });

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // CALCULATE PRUNING COUNTDOWN (45 DAYS)
  getPruningDaysRemaining(record: FarmerProductionRecord): number {
    if (!record.pruningDate) return 0;

    const pruningDate = this.parseLocalDate(record.pruningDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (!pruningDate) return 0;

    const elapsedDays = Math.floor(
      (today.getTime() - pruningDate.getTime()) / 86400000
    );

    const cycleDays = record.pruningCycleDays || 45;

    return Math.max(0, Math.min(cycleDays, cycleDays - elapsedDays));
  }

  // PREPARATION REMINDER WHEN 7 DAYS OR LESS REMAIN
  isPruningPreparationDue(record: FarmerProductionRecord): boolean {
    if (record.activityType !== 'mulberry-pruning') return false;

    const remaining = this.getPruningDaysRemaining(record);

    return remaining > 0 && remaining <= 7;
  }

  // CHECK IF PRUNING CYCLE IS COMPLETE
  isPruningCycleComplete(record: FarmerProductionRecord): boolean {
    return (
      record.activityType === 'mulberry-pruning' &&
      !!record.pruningDate &&
      this.getPruningDaysRemaining(record) === 0
    );
  }

  // PARSE DATE WITHOUT UTC DATE SHIFT
  private parseLocalDate(dateValue: string): Date | null {
    const parts = dateValue.split('-').map(Number);

    if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) {
      return null;
    }

    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setHours(0, 0, 0, 0);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
