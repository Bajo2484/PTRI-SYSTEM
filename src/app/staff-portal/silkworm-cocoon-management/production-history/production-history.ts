
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  SilkwormRequestService,
  SilkwormBatch
} from '../../../services/silkworm-request.service';

import {
  CocoonProductionService,
  CocoonHarvestRecord,
  CocoonReturnRecord
} from '../../../services/cocoon-production.service';

// =====================================
// PRODUCTION COLLECTION
// Confirmed PTRI received returns only
// =====================================

interface ProductionCollection {
  collectionId: string;
  dateReturned: string;
  weightReceived: number;
}

// =====================================
// PRODUCTION STATUS
// =====================================

type ProductionStatus =
  | 'No Harvest Yet'
  | 'In Production'
  | 'Pending Return'
  | 'Partially Received'
  | 'Completed';

// =====================================
// PRODUCTION RECORD
// One record per original worm batch
// =====================================

interface ProductionRecord {
  id: string;
  batchId: string;
  batchNumber: string;
  requestNumber: string;

  farmerUid: string;
  farmerName: string;

  dateGiven: string;
  deliveryDate: string;
  traysGiven: number;
  quantityGiven: number;

  silkwormType: string;
  breed: string;
  batchStatus: string;

  harvests: CocoonHarvestRecord[];
  returns: CocoonReturnRecord[];

  totalHarvestRecords: number;
  totalHarvestedWeight: number;

  totalWeightCollected: number;
  lastCollectionDate: string | null;

  collections: ProductionCollection[];

  pendingReturns: number;
  productionStatus: ProductionStatus;
}

@Component({
  selector: 'app-production-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-history.html',
  styleUrl: './production-history.css',
})
export class ProductionHistory implements OnInit {

  searchTerm = '';

  selectedRecord: ProductionRecord | null = null;
  showHistoryModal = false;

  productionRecords: ProductionRecord[] = [];

  isLoading = false;
  errorMessage = '';

  constructor(
    private silkwormRequestService: SilkwormRequestService,
    private cocoonProductionService: CocoonProductionService
  ) {}

  ngOnInit(): void {
    this.loadProductionHistory();
  }

  // =====================================
  // LOAD ACTUAL PRODUCTION HISTORY
  // =====================================

  async loadProductionHistory(): Promise<void> {

    this.isLoading = true;
    this.errorMessage = '';

    try {

      const [
        batches,
        harvestRecords,
        returnRecords
      ] = await Promise.all([
        this.silkwormRequestService.getAllBatches(),
        this.cocoonProductionService.getAllHarvestRecordsForStaff(),
        this.cocoonProductionService.getAllReturnRecordsForStaff()
      ]);

      this.productionRecords = this.buildProductionRecords(
        batches,
        harvestRecords,
        returnRecords
      );

    } catch (error) {

      console.error('Failed to load production history:', error);

      this.errorMessage =
        'Unable to load production history. Please check your connection and try again.';

    } finally {

      this.isLoading = false;

    }
  }

  // =====================================
  // CONNECT BATCHES, HARVESTS AND RETURNS
  // =====================================

  private buildProductionRecords(
    batches: SilkwormBatch[],
    harvestRecords: CocoonHarvestRecord[],
    returnRecords: CocoonReturnRecord[]
  ): ProductionRecord[] {

    return batches.map(batch => {

      // Match harvests using the original Firestore batch ID.
      const batchHarvests = harvestRecords
        .filter(harvest => harvest.batchId === batch.id)
        .sort((a, b) =>
          this.getDateValue(b.harvestDate) -
          this.getDateValue(a.harvestDate)
        );

      // Get the harvest IDs belonging to this batch.
      const harvestIds = new Set(
        batchHarvests.map(harvest => harvest.id)
      );

      // Match all returns using both batchId and harvestId.
      const batchReturns = returnRecords
        .filter(record =>
          record.batchId === batch.id &&
          harvestIds.has(record.harvestId)
        )
        .sort((a, b) =>
          this.getDateValue(b.returnDate) -
          this.getDateValue(a.returnDate)
        );

      // Only confirmed PTRI received returns count as collections.
      const receivedReturns = batchReturns.filter(record =>
        record.status === 'Received'
      );

      const collections: ProductionCollection[] =
        receivedReturns.map(record => ({
          collectionId: record.returnNumber,
          dateReturned: record.returnDate,
          weightReceived: this.toValidNumber(
            record.actualReceivedWeight
          )
        }));

      // Calculate actual weight received by PTRI.
      const totalWeightCollected = collections.reduce(
        (total, collection) =>
          total + collection.weightReceived,
        0
      );

      // Calculate total weight recorded by farmers during harvest.
      const totalHarvestedWeight = batchHarvests.reduce(
        (total, harvest) =>
          total + this.toValidNumber(harvest.harvestedWeight),
        0
      );

      // Count harvests still awaiting completed return.
      const pendingReturns = batchHarvests.filter(harvest =>
        harvest.returnStatus !== 'Received'
      ).length;

      return {
        id: batch.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber || batch.id,
        requestNumber: batch.requestNumber || '',

        farmerUid: batch.farmerUid || '',
        farmerName: batch.farmerName || 'Unknown Farmer',

        dateGiven: batch.assignedDate || '',
        deliveryDate: batch.deliveryDate || '',

        traysGiven: this.toValidNumber(batch.trays),
        quantityGiven: this.toValidNumber(batch.quantity),

        silkwormType: batch.silkwormType || '',
        breed: batch.breed || '',
        batchStatus: batch.status || '',

        harvests: batchHarvests,
        returns: batchReturns,

        totalHarvestRecords: batchHarvests.length,
        totalHarvestedWeight,

        totalWeightCollected,

        lastCollectionDate:
          collections.length > 0
            ? collections[0].dateReturned
            : null,

        collections,

        pendingReturns,

        productionStatus: this.getProductionStatus(
          batchHarvests,
          batchReturns,
          receivedReturns
        )
      };

    }).sort((a, b) =>
      this.getDateValue(b.dateGiven) -
      this.getDateValue(a.dateGiven)
    );
  }

  // =====================================
  // DETERMINE PRODUCTION STATUS
  // =====================================

  private getProductionStatus(
    harvests: CocoonHarvestRecord[],
    returns: CocoonReturnRecord[],
    receivedReturns: CocoonReturnRecord[]
  ): ProductionStatus {

    if (harvests.length === 0) {
      return 'No Harvest Yet';
    }

    const hasPendingHarvest = harvests.some(harvest =>
      harvest.returnStatus === 'Pending Return'
    );

    const hasSubmittedReturn = returns.some(record =>
      record.status === 'Submitted'
    );

    const hasReceivedReturn = receivedReturns.length > 0;

    const hasOutstandingReturn =
      hasPendingHarvest || hasSubmittedReturn;

    if (hasReceivedReturn && hasOutstandingReturn) {
      return 'Partially Received';
    }

    if (hasOutstandingReturn) {
      return 'Pending Return';
    }

    if (
      harvests.every(harvest =>
        harvest.returnStatus === 'Received'
      ) &&
      hasReceivedReturn
    ) {
      return 'Completed';
    }

    return 'In Production';
  }

  // =====================================
  // SAFE NUMBER CONVERSION
  // =====================================

  private toValidNumber(value: unknown): number {

    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : 0;
  }

  // =====================================
  // SAFE DATE COMPARISON
  // =====================================

  private getDateValue(
    value: string | null | undefined
  ): number {

    if (!value) return 0;

    const dateValue = new Date(value).getTime();

    return Number.isFinite(dateValue)
      ? dateValue
      : 0;
  }

  // =====================================
  // OVERVIEW TOTALS
  // =====================================

  get totalBatches(): number {
    return this.productionRecords.length;
  }

  get totalHarvestRecords(): number {

    return this.productionRecords.reduce(
      (total, record) =>
        total + record.totalHarvestRecords,
      0
    );
  }

  get totalWeightCollected(): number {

    return this.productionRecords.reduce(
      (total, record) =>
        total + record.totalWeightCollected,
      0
    );
  }

  get completedBatches(): number {

    return this.productionRecords.filter(record =>
      record.productionStatus === 'Completed'
    ).length;
  }

  get totalPendingReturns(): number {

    return this.productionRecords.reduce(
      (total, record) =>
        total + record.pendingReturns,
      0
    );
  }

  // =====================================
  // SEARCH FILTER
  // =====================================

  get filteredRecords(): ProductionRecord[] {

    const search = this.searchTerm.toLowerCase().trim();

    if (!search) {
      return this.productionRecords;
    }

    return this.productionRecords.filter(record =>
      record.farmerName.toLowerCase().includes(search) ||
      record.batchNumber.toLowerCase().includes(search) ||
      record.batchId.toLowerCase().includes(search) ||
      record.requestNumber.toLowerCase().includes(search)
    );
  }

  // =====================================
  // VIEW PRODUCTION HISTORY
  // =====================================

  viewHistory(record: ProductionRecord): void {

    this.selectedRecord = record;
    this.showHistoryModal = true;

  }

  // =====================================
  // CLOSE HISTORY MODAL
  // =====================================

  closeHistoryModal(): void {

    this.showHistoryModal = false;
    this.selectedRecord = null;

  }

}
