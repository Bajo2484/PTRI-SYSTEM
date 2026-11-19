
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CocoonCollectionRecord {
  id: string;
  batchId: string;
  farmerName: string;
  dateReceived: string;
  weightReceived: number;
}

interface BatchOption {
  batchId: string;
  farmerName: string;
}

@Component({
  selector: 'app-cocoon-collection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cocoon-collection.html',
  styleUrl: './cocoon-collection.css',
})
export class CocoonCollection {

  // MODAL CONTROLS
  showCreateModal = false;
  showViewModal = false;

  // SEARCH
  searchTerm = '';

  // SELECTED COLLECTION
  selectedCollection: CocoonCollectionRecord | null = null;

  // FORM DATA
  selectedBatchId = '';
  dateReceived = '';
  weightReceived: number | null = null;

  // AVAILABLE SILKWORM BATCHES
  batchOptions: BatchOption[] = [
    { batchId: 'SWB-2026-001', farmerName: 'Juan Dela Cruz' },
    { batchId: 'SWB-2026-002', farmerName: 'Maria Santos' },
    { batchId: 'SWB-2026-003', farmerName: 'Pedro Reyes' },
    { batchId: 'SWB-2026-004', farmerName: 'Ana Garcia' },
    { batchId: 'SWB-2026-005', farmerName: 'Carlos Mendoza' },
  ];

  // SAMPLE COLLECTION RECORDS
  collections: CocoonCollectionRecord[] = [
    {
      id: 'CC-2026-001',
      batchId: 'SWB-2026-001',
      farmerName: 'Juan Dela Cruz',
      dateReceived: '2026-11-19',
      weightReceived: 8.5,
    },
    {
      id: 'CC-2026-002',
      batchId: 'SWB-2026-002',
      farmerName: 'Maria Santos',
      dateReceived: '2026-11-20',
      weightReceived: 6.0,
    },
    {
      id: 'CC-2026-003',
      batchId: 'SWB-2026-003',
      farmerName: 'Pedro Reyes',
      dateReceived: '2026-11-21',
      weightReceived: 7.2,
    },
  ];

  // AUTOMATIC FARMER NAME
  get selectedFarmerName(): string {
    const batch = this.batchOptions.find(
      item => item.batchId === this.selectedBatchId
    );

    return batch?.farmerName ?? '';
  }

  // OVERVIEW CARD VALUES
  get totalCollections(): number {
    return this.collections.length;
  }

  get totalWeightCollected(): number {
    return this.collections.reduce(
      (total, item) => total + item.weightReceived,
      0
    );
  }

  get totalFarmers(): number {
    return new Set(
      this.collections.map(item => item.farmerName)
    ).size;
  }

  // SEARCH FILTER
  get filteredCollections(): CocoonCollectionRecord[] {
    const search = this.searchTerm.toLowerCase().trim();

    if (!search) {
      return this.collections;
    }

    return this.collections.filter(item =>
      item.farmerName.toLowerCase().includes(search) ||
      item.batchId.toLowerCase().includes(search)
    );
  }

  // OPEN CREATE MODAL
  createCollection(): void {
    this.resetForm();
    this.showCreateModal = true;
  }

  // CLOSE CREATE MODAL
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  // SELECT BATCH
  onBatchChange(): void {
    // Farmer name automatically updates through selectedFarmerName.
  }

  // SAVE COLLECTION
  saveCollection(): void {
    if (
      !this.selectedBatchId ||
      !this.selectedFarmerName ||
      !this.dateReceived ||
      this.weightReceived === null ||
      !Number.isFinite(this.weightReceived) ||
      this.weightReceived <= 0
    ) {
      return;
    }

    const newCollection: CocoonCollectionRecord = {
      id: this.generateCollectionId(),
      batchId: this.selectedBatchId,
      farmerName: this.selectedFarmerName,
      dateReceived: this.dateReceived,
      weightReceived: this.weightReceived,
    };

    this.collections.unshift(newCollection);
    this.closeCreateModal();
  }

  // GENERATE COLLECTION ID
  private generateCollectionId(): string {
    const nextNumber = this.collections.length + 1;

    return `CC-2026-${String(nextNumber).padStart(3, '0')}`;
  }

  // VIEW COLLECTION DETAILS
  viewCollection(collection: CocoonCollectionRecord): void {
    this.selectedCollection = collection;
    this.showViewModal = true;
  }

  // CLOSE VIEW MODAL
  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedCollection = null;
  }

  // RESET FORM
  private resetForm(): void {
    this.selectedBatchId = '';
    this.dateReceived = '';
    this.weightReceived = null;
  }
}
