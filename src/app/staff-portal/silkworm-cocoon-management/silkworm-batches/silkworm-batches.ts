
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// =====================================
// INTERFACES
// =====================================

interface SilkwormBatch {
  id: string;
  farmer: string;
  farmerId: string;

  totalMulberryHills: number;
  availableMulberryLeavesKg: number;

  silkwormType: string;
  breed: string;

  quantityPrepared: number;
  quantityGiven: number;

  dateGiven: string;
  receivedBy: string;
  preparedBy: string;

  remarks: string;
  qrValue: string;
}

interface FarmerOption {
  name: string;
  farmerId: string;
  totalMulberryHills: number;
  availableMulberryLeavesKg: number;
}

// =====================================
// COMPONENT
// =====================================

@Component({
  selector: 'app-silkworm-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silkworm-batches.html',
  styleUrl: './silkworm-batches.css',
})
export class SilkwormBatches {

  pageTitle = 'Silkworm Batches';

  pageDescription =
    'Manage silkworm batches distributed to farmers and monitor their mulberry resources and batch records.';

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  searchTerm = '';
  selectedFarmer = 'All Farmers';

  get farmers(): string[] {
    return [
      'All Farmers',
      ...new Set(this.batches.map(batch => batch.farmer))
    ];
  }

  // =====================================
  // FARMER DIRECTORY
  // Sample farmer resource information
  // Replace with latest farmer requests
  // when Firebase is integrated.
  // =====================================

  farmerDirectory: FarmerOption[] = [
    {
      name: 'Juan Dela Cruz',
      farmerId: 'FRM-001',
      totalMulberryHills: 250,
      availableMulberryLeavesKg: 85
    },
    {
      name: 'Maria Santos',
      farmerId: 'FRM-002',
      totalMulberryHills: 180,
      availableMulberryLeavesKg: 60
    },
    {
      name: 'Pedro Reyes',
      farmerId: 'FRM-003',
      totalMulberryHills: 220,
      availableMulberryLeavesKg: 75
    },
    {
      name: 'Ana Dela Cruz',
      farmerId: 'FRM-004',
      totalMulberryHills: 150,
      availableMulberryLeavesKg: 50
    },
    {
      name: 'Ramon Garcia',
      farmerId: 'FRM-005',
      totalMulberryHills: 300,
      availableMulberryLeavesKg: 100
    }
  ];

  // =====================================
  // MODAL CONTROLS
  // =====================================

  showCreateModal = false;
  showViewModal = false;

  selectedBatchId = '';
  modalError = '';

  // =====================================
  // CREATE BATCH FORM
  // =====================================

  createForm = this.getEmptyForm();

  private getEmptyForm() {
    return {
      farmer: '',
      farmerId: '',

      totalMulberryHills: 0,
      availableMulberryLeavesKg: 0,

      silkwormType: 'Mulberry Silkworm',
      breed: '',

      quantityPrepared: 0,
      quantityGiven: 0,

      dateGiven: '',
      receivedBy: '',
      preparedBy: 'PTRI Staff',

      remarks: ''
    };
  }

  // =====================================
  // SAMPLE BATCH RECORDS
  // =====================================

  batches: SilkwormBatch[] = [
    {
      id: 'SWB-2026-001',
      farmer: 'Juan Dela Cruz',
      farmerId: 'FRM-001',

      totalMulberryHills: 250,
      availableMulberryLeavesKg: 85,

      silkwormType: 'Mulberry Silkworm',
      breed: 'Not specified',

      quantityPrepared: 5,
      quantityGiven: 5,

      dateGiven: 'Nov. 19, 2026',
      receivedBy: 'Juan Dela Cruz',
      preparedBy: 'PTRI Staff',

      remarks: 'Batch successfully given to the farmer.',
      qrValue: 'SWB-2026-001'
    },
    {
      id: 'SWB-2026-002',
      farmer: 'Maria Santos',
      farmerId: 'FRM-002',

      totalMulberryHills: 180,
      availableMulberryLeavesKg: 60,

      silkwormType: 'Mulberry Silkworm',
      breed: 'Not specified',

      quantityPrepared: 3,
      quantityGiven: 3,

      dateGiven: 'Nov. 20, 2026',
      receivedBy: 'Maria Santos',
      preparedBy: 'PTRI Staff',

      remarks: 'Batch successfully given to the farmer.',
      qrValue: 'SWB-2026-002'
    },
    {
      id: 'SWB-2026-003',
      farmer: 'Pedro Reyes',
      farmerId: 'FRM-003',

      totalMulberryHills: 220,
      availableMulberryLeavesKg: 75,

      silkwormType: 'Mulberry Silkworm',
      breed: 'Not specified',

      quantityPrepared: 4,
      quantityGiven: 4,

      dateGiven: 'Nov. 21, 2026',
      receivedBy: 'Pedro Reyes',
      preparedBy: 'PTRI Staff',

      remarks: 'Batch successfully given to the farmer.',
      qrValue: 'SWB-2026-003'
    },
    {
      id: 'SWB-2026-004',
      farmer: 'Ana Dela Cruz',
      farmerId: 'FRM-004',

      totalMulberryHills: 150,
      availableMulberryLeavesKg: 50,

      silkwormType: 'Mulberry Silkworm',
      breed: 'Not specified',

      quantityPrepared: 2,
      quantityGiven: 2,

      dateGiven: 'Nov. 22, 2026',
      receivedBy: 'Ana Dela Cruz',
      preparedBy: 'PTRI Staff',

      remarks: 'Batch successfully given to the farmer.',
      qrValue: 'SWB-2026-004'
    },
    {
      id: 'SWB-2026-005',
      farmer: 'Ramon Garcia',
      farmerId: 'FRM-005',

      totalMulberryHills: 300,
      availableMulberryLeavesKg: 100,

      silkwormType: 'Mulberry Silkworm',
      breed: 'Not specified',

      quantityPrepared: 6,
      quantityGiven: 6,

      dateGiven: 'Nov. 18, 2026',
      receivedBy: 'Ramon Garcia',
      preparedBy: 'PTRI Staff',

      remarks: 'Batch successfully given to the farmer.',
      qrValue: 'SWB-2026-005'
    }
  ];

  // =====================================
  // SELECTED BATCH
  // =====================================

  get selectedBatch(): SilkwormBatch | undefined {
    return this.batches.find(
      batch => batch.id === this.selectedBatchId
    );
  }

  // =====================================
  // FILTERED BATCH RECORDS
  // =====================================

  get filteredBatches(): SilkwormBatch[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.batches.filter(batch => {
      const matchesSearch =
        batch.farmer.toLowerCase().includes(search) ||
        batch.id.toLowerCase().includes(search);

      const matchesFarmer =
        this.selectedFarmer === 'All Farmers' ||
        batch.farmer === this.selectedFarmer;

      return matchesSearch && matchesFarmer;
    });
  }

  // =====================================
  // OVERVIEW CARDS
  // =====================================

  get totalBatches(): number {
    return this.batches.length;
  }

  get farmersServed(): number {
    return new Set(
      this.batches.map(batch => batch.farmerId)
    ).size;
  }

  get totalTraysGiven(): number {
    return this.batches.reduce(
      (total, batch) => total + batch.quantityGiven,
      0
    );
  }

  // =====================================
  // VIEW BATCH MODAL
  // =====================================

  openBatchDetails(batch: SilkwormBatch): void {
    this.selectedBatchId = batch.id;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
  }

  // =====================================
  // CREATE BATCH MODAL
  // =====================================

  createBatch(): void {
    this.createForm = this.getEmptyForm();
    this.modalError = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.modalError = '';
  }

  // =====================================
  // AUTOMATIC FARMER INFORMATION
  // =====================================

  onFarmerChange(): void {
    const farmer = this.farmerDirectory.find(
      item => item.name === this.createForm.farmer
    );

    if (!farmer) {
      this.createForm.farmerId = '';
      this.createForm.totalMulberryHills = 0;
      this.createForm.availableMulberryLeavesKg = 0;
      this.createForm.receivedBy = '';
      return;
    }

    this.createForm.farmerId = farmer.farmerId;
    this.createForm.totalMulberryHills =
      farmer.totalMulberryHills;

    this.createForm.availableMulberryLeavesKg =
      farmer.availableMulberryLeavesKg;

    this.createForm.receivedBy = farmer.name;
  }

  // =====================================
  // GENERATE UNIQUE BATCH ID
  // =====================================

  private generateBatchId(): string {
    const year = new Date().getFullYear();

    const highestNumber = this.batches.reduce(
      (highest, batch) => {
        const number = Number(batch.id.split('-').pop()) || 0;
        return Math.max(highest, number);
      },
      0
    );

    const nextNumber = String(highestNumber + 1).padStart(3, '0');

    return `SWB-${year}-${nextNumber}`;
  }

  // =====================================
  // SAVE NEW BATCH
  // =====================================

  saveBatch(): void {
    this.modalError = '';

    const form = this.createForm;

    if (
      !form.farmer ||
      !form.dateGiven ||
      !form.receivedBy ||
      !form.preparedBy
    ) {
      this.modalError = 'Please complete all required fields.';
      return;
    }

    if (
      !form.totalMulberryHills ||
      !form.availableMulberryLeavesKg
    ) {
      this.modalError =
        'The selected farmer must have available farm resource information.';
      return;
    }

    if (
      form.quantityPrepared <= 0 ||
      form.quantityGiven <= 0
    ) {
      this.modalError = 'Please enter a valid tray quantity.';
      return;
    }

    if (form.quantityGiven > form.quantityPrepared) {
      this.modalError =
        'Quantity given cannot exceed the quantity prepared.';
      return;
    }

    if (!form.silkwormType.trim()) {
      this.modalError = 'Please enter the silkworm type.';
      return;
    }

    const batchId = this.generateBatchId();

    const newBatch: SilkwormBatch = {
      id: batchId,

      farmer: form.farmer,
      farmerId: form.farmerId,

      totalMulberryHills: Number(form.totalMulberryHills),
      availableMulberryLeavesKg:
        Number(form.availableMulberryLeavesKg),

      silkwormType: form.silkwormType,
      breed: form.breed.trim() || 'Not specified',

      quantityPrepared: Number(form.quantityPrepared),
      quantityGiven: Number(form.quantityGiven),

      dateGiven: form.dateGiven,
      receivedBy: form.receivedBy,
      preparedBy: form.preparedBy,

      remarks: form.remarks.trim(),

      qrValue: batchId
    };

    this.batches.unshift(newBatch);

    this.selectedBatchId = batchId;
    this.selectedFarmer = 'All Farmers';
    this.searchTerm = '';

    this.showCreateModal = false;
    this.showViewModal = true;

    this.createForm = this.getEmptyForm();
  }

  // =====================================
  // RESET FILTERS
  // =====================================

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedFarmer = 'All Farmers';
  }

}
