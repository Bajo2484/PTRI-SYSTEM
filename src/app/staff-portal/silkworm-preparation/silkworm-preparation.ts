
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  FarmerAccount,
  FarmerAccountService
} from '../../services/farmer-account.service';

import {
  MulberryProductionService,
  MulberryPruningRecord
} from '../../services/mulberry-production.service';

import {
  SilkwormPreparationService,
  SilkwormPreparationBatch,
  PreparationStatus
} from '../../services/silkworm-preparation.service';

type Farmer = FarmerAccount;

@Component({
  selector: 'app-silkworm-preparation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silkworm-preparation.html',
  styleUrl: './silkworm-preparation.css'
})
export class SilkwormPreparation implements OnInit {
  constructor(
    private farmerAccountService: FarmerAccountService,
    private mulberryProductionService: MulberryProductionService,
    private preparationService: SilkwormPreparationService,
    private cdr: ChangeDetectorRef
  ) {}

  farmers: Farmer[] = [];
  batches: SilkwormPreparationBatch[] = [];
  pruningCycles: MulberryPruningRecord[] = [];

  isLoading = false;
  isSaving = false;
  errorMessage = '';

  searchTerm = '';
  selectedFarmerType = 'All';
  selectedStatus = 'All Status';

  showAddModal = false;

  selectedFarmerId = '';
  selectedPruningRecordId = '';
  preparationStartDate = '';
  expectedReadyDate = '';
  boxQuantity: number | null = null;
  remarks = '';

  readonly statuses: PreparationStatus[] = [
    'Scheduled',
    'Preparing',
    'Ready for Delivery',
    'Cancelled'
  ];

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(showLoading = true): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    if (showLoading) {
      Swal.fire({
        title: 'Loading Preparation Records',
        text: 'Please wait while we retrieve the records...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        background: '#fffdf8',
        color: '#493a2c',
        didOpen: () => Swal.showLoading()
      });
    }

    try {
      const [farmers, batches] = await Promise.all([
        this.farmerAccountService.getFarmers(),
        this.preparationService.getPreparationBatches()
      ]);

      this.farmers = farmers;
      this.batches = batches;

    } catch (error) {
      console.error('Error loading preparation records:', error);
      this.errorMessage =
        'Unable to load preparation records. Please check your connection and Firebase permissions.';
    } finally {
      this.isLoading = false;
      if (showLoading) Swal.close();
      this.cdr.detectChanges();
    }
  }

  get totalBatches(): number {
    return this.batches.length;
  }

  get ongoingBatches(): number {
    return this.batches.filter(batch =>
      batch.status === 'Preparing'
    ).length;
  }

  get readyBatches(): number {
    return this.batches.filter(batch =>
      batch.status === 'Ready for Delivery'
    ).length;
  }

  get completedBatches(): number {
    // Ready for Delivery is not the same as Delivered.
    // Delivery is handled by the separate delivery feature.
    return this.readyBatches;
  }

  get filteredBatches(): SilkwormPreparationBatch[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.batches.filter(batch => {
      const matchesSearch =
        !search ||
        batch.batchCode.toLowerCase().includes(search) ||
        batch.farmerName.toLowerCase().includes(search) ||
        (batch.communityName || '').toLowerCase().includes(search);

      const matchesType =
        this.selectedFarmerType === 'All' ||
        batch.farmerType === this.selectedFarmerType;

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        batch.status === this.selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) =>
      b.preparationStartDate.localeCompare(a.preparationStartDate)
    );
  }

  get recentHistory(): SilkwormPreparationBatch[] {
    return [...this.batches]
      .sort((a, b) =>
        b.preparationStartDate.localeCompare(a.preparationStartDate)
      )
      .slice(0, 5);
  }

  openAddModal(): void {
    this.selectedFarmerId = '';
    this.selectedPruningRecordId = '';
    this.preparationStartDate = '';
    this.expectedReadyDate = '';
    this.boxQuantity = null;
    this.remarks = '';
    this.pruningCycles = [];
    this.errorMessage = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (this.isSaving) return;

    this.showAddModal = false;
    this.pruningCycles = [];
    this.errorMessage = '';
  }

  async onFarmerChange(): Promise<void> {
    this.selectedPruningRecordId = '';
    this.pruningCycles = [];

    const farmer = this.selectedFarmer;

    if (!farmer) {
      this.cdr.detectChanges();
      return;
    }

    if (!farmer.authUid) {
      this.errorMessage =
        'This farmer has no linked account UID, so pruning records cannot be retrieved.';
      this.cdr.detectChanges();
      return;
    }

    try {
      this.pruningCycles =
        await this.mulberryProductionService.getFarmerPruningRecords(
          farmer.authUid
        );
    } catch (error) {
      console.error('Error loading farmer pruning cycles:', error);
      this.errorMessage = 'Unable to load this farmer’s pruning cycles.';
    }

    this.cdr.detectChanges();
  }

  get selectedFarmer(): Farmer | undefined {
    return this.farmers.find(
      farmer => farmer.id === this.selectedFarmerId
    );
  }

  get selectedCycle(): MulberryPruningRecord | undefined {
    return this.pruningCycles.find(
      cycle => cycle.id === this.selectedPruningRecordId
    );
  }

  getCycleStartDate(cycle: MulberryPruningRecord): string {
    return cycle.startDate || cycle.pruningDate || '';
  }

  getCycleEndDate(cycle: MulberryPruningRecord): string {
    return cycle.endDate || '';
  }

  async savePreparation(): Promise<void> {
    if (this.isSaving) return;

    const farmer = this.selectedFarmer;
    const cycle = this.selectedCycle;

    if (!farmer) {
      this.errorMessage = 'Please select a farmer.';
      return;
    }

    if (!farmer.authUid) {
      this.errorMessage = 'The selected farmer has no linked account UID.';
      return;
    }

    if (!cycle?.id) {
      this.errorMessage = 'Please select a valid pruning cycle.';
      return;
    }

    if (!this.preparationStartDate || !this.expectedReadyDate) {
      this.errorMessage =
        'Please provide the preparation start date and expected ready date.';
      return;
    }

    if (this.expectedReadyDate < this.preparationStartDate) {
      this.errorMessage =
        'Expected Ready Date cannot be earlier than Preparation Start Date.';
      return;
    }

    if (
      !this.boxQuantity ||
      !Number.isInteger(Number(this.boxQuantity)) ||
      Number(this.boxQuantity) < 1
    ) {
      this.errorMessage = 'Please enter a valid number of boxes.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    Swal.fire({
      title: 'Saving Preparation Batch',
      text: 'Please wait while we save the record...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      await this.preparationService.addPreparationBatch({
        farmerId: farmer.id,
        farmerUid: farmer.authUid,
        farmerName: farmer.fullName,
        farmerType: farmer.farmerType,
        communityName: farmer.communityName || '',
        pruningRecordId: cycle.id,
        pruningStartDate: this.getCycleStartDate(cycle),
        pruningEndDate: this.getCycleEndDate(cycle),
        preparationStartDate: this.preparationStartDate,
        expectedReadyDate: this.expectedReadyDate,
        boxQuantity: Number(this.boxQuantity),
        remarks: this.remarks.trim(),
        status: 'Scheduled'
      });

      this.showAddModal = false;
      await this.loadData(false);

      await Swal.fire({
        icon: 'success',
        title: 'Preparation Batch Added!',
        text: 'The new silkworm preparation batch has been saved successfully.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } catch (error) {
      console.error('Error saving preparation batch:', error);
      Swal.close();

      this.errorMessage =
        'Unable to save the preparation batch. Please try again.';

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Save Batch',
        text: this.errorMessage,
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async changeStatus(
    batch: SilkwormPreparationBatch,
    status: PreparationStatus
  ): Promise<void> {
    const result = await Swal.fire({
      title: 'Update Preparation Status?',
      text: `Change ${batch.batchCode} to "${status}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#245638',
      cancelButtonColor: '#795033',
      background: '#fffdf8',
      color: '#493a2c'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Updating Status',
      allowOutsideClick: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      await this.preparationService.updatePreparationStatus(
        batch.id,
        status
      );

      await this.loadData(false);
      await Swal.fire({
        icon: 'success',
        title: 'Status Updated!',
        text: `${batch.batchCode} is now ${status}.`,
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } catch (error) {
      console.error('Error updating preparation status:', error);
      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Unable to update the preparation status.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
    }

    this.cdr.detectChanges();
  }

  trackByBatchId(
    index: number,
    batch: SilkwormPreparationBatch
  ): string {
    return batch.id;
  }
}
