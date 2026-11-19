
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductionRecord {
  id: string;
  farmerName: string;
  batchId: string;
  dateGiven: string;
  traysGiven: number;
  totalWeightCollected: number;
  lastCollectionDate: string | null;
  collections: {
    collectionId: string;
    dateReceived: string;
    weightReceived: number;
  }[];
}

@Component({
  selector: 'app-production-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-history.html',
  styleUrl: './production-history.css',
})
export class ProductionHistory {

  searchTerm = '';
  selectedRecord: ProductionRecord | null = null;
  showHistoryModal = false;

  productionRecords: ProductionRecord[] = [
    {
      id: '1',
      farmerName: 'Juan Dela Cruz',
      batchId: 'SWB-2026-001',
      dateGiven: '2026-11-10',
      traysGiven: 5,
      totalWeightCollected: 8.5,
      lastCollectionDate: '2026-11-19',
      collections: [
        {
          collectionId: 'CCR-2026-001',
          dateReceived: '2026-11-19',
          weightReceived: 4.5,
        },
        {
          collectionId: 'CCR-2026-002',
          dateReceived: '2026-11-20',
          weightReceived: 4.0,
        },
      ],
    },
    {
      id: '2',
      farmerName: 'Maria Santos',
      batchId: 'SWB-2026-002',
      dateGiven: '2026-11-12',
      traysGiven: 4,
      totalWeightCollected: 6.0,
      lastCollectionDate: '2026-11-20',
      collections: [
        {
          collectionId: 'CCR-2026-003',
          dateReceived: '2026-11-20',
          weightReceived: 6.0,
        },
      ],
    },
    {
      id: '3',
      farmerName: 'Pedro Reyes',
      batchId: 'SWB-2026-003',
      dateGiven: '2026-11-15',
      traysGiven: 3,
      totalWeightCollected: 0,
      lastCollectionDate: null,
      collections: [],
    },
  ];

  get totalBatches(): number {
    return this.productionRecords.length;
  }

  get totalWeightCollected(): number {
    return this.productionRecords.reduce(
      (total, record) => total + record.totalWeightCollected,
      0
    );
  }

  get completedBatches(): number {
    return this.productionRecords.filter(
      record => record.totalWeightCollected > 0
    ).length;
  }

  get filteredRecords(): ProductionRecord[] {
    const search = this.searchTerm.toLowerCase().trim();

    if (!search) return this.productionRecords;

    return this.productionRecords.filter(record =>
      record.farmerName.toLowerCase().includes(search) ||
      record.batchId.toLowerCase().includes(search)
    );
  }

  viewHistory(record: ProductionRecord): void {
    this.selectedRecord = record;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedRecord = null;
  }
}
