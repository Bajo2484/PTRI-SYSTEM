
import { Injectable } from '@angular/core';

// SILKWORM WORKFLOW STATUS
export type SilkwormStatus =
  | 'Received'
  | 'In Rearing'
  | 'Ready for Harvest'
  | 'Harvested'
  | 'Return Submitted'
  | 'Returned to PTRI';

export type SilkwormStage =
  | '1st Instar'
  | '2nd Instar'
  | '3rd Instar'
  | '4th Instar'
  | '5th Instar'
  | 'Mounting'
  | 'Cocoon Harvest'
  | 'Completed';
// COCOON RETURN STATUS
export type CocoonReturnStatus =
  | 'Pending Return'
  | 'Returned to PTRI'
  | 'Confirmed';

// ORIGINAL SILKWORM BATCH
export interface SilkwormBatch {
  id: string;
  batchNumber: string;
  farmerUid: string;
  farmerName: string;
  boxes: number;
  receivedDate: string;

  currentStage: SilkwormStage;
  status: SilkwormStatus;

  lastUpdated: string;
  remarks: string;

  // Separate QR for original silkworm batch
  silkwormQrCodeValue?: string;

  // Linked cocoon record
  cocoonHarvestId?: string;
  cocoonQrCodeValue?: string;

  // Existing fields retained for compatibility
  mountingDate?: string;
  harvestDate?: string;
  harvestedWeight?: number;
  returnDate?: string;
  returnedWeight?: number;
  returnConfirmed?: boolean;
  receivingRemarks?: string;
}

// SEPARATE COCOON HARVEST RECORD
export interface CocoonHarvestRecord {
  id: string;
  cocoonBatchNumber: string;

  // Link to original silkworm batch
  silkwormBatchId: string;
  silkwormBatchNumber: string;

  farmerUid: string;
  farmerName: string;

  harvestDate: string;
  harvestedWeight: number;
  cocoonQuantity?: number;
  cocoonCondition: string;
  remarks: string;

  returnDate?: string;
  expectedReturnDate?: string;

  // Separate QR for harvested cocoons
  cocoonQrCodeValue: string;

  returnStatus: CocoonReturnStatus;

  // PTRI verification
  actualReceivedWeight?: number;
  receivingRemarks?: string;
  returnConfirmed: boolean;
  confirmedDate?: string;

  lastUpdated: string;
}

@Injectable({
  providedIn: 'root',
})
export class SilkwormProductionService {

  // TEMPORARY MOCK DATA
  // Firestore integration will be added later.

  private batches: SilkwormBatch[] = [
    {
      id: '1',
      batchNumber: 'SW-2026-001',
      farmerUid: 'FARMER-001',
      farmerName: 'Juan Dela Cruz',
      boxes: 5,
      receivedDate: '2026-11-15',
      currentStage: '3rd Instar',
      status: 'In Rearing',
      lastUpdated: '2026-11-18',
      remarks: 'Silkworms are actively feeding.',
      silkwormQrCodeValue: 'SILKWORM-BATCH-SW-2026-001',
    },
    {
      id: '2',
      batchNumber: 'SW-2026-002',
      farmerUid: 'FARMER-001',
      farmerName: 'Juan Dela Cruz',
      boxes: 4,
      receivedDate: '2026-10-20',
      currentStage: 'Mounting',
      status: 'Ready for Harvest',
      lastUpdated: '2026-11-18',
      remarks: 'Silkworms are ready for cocoon harvesting.',
      mountingDate: '2026-11-16',
      silkwormQrCodeValue: 'SILKWORM-BATCH-SW-2026-002',
    },
    {
      id: '3',
      batchNumber: 'SW-2026-003',
      farmerUid: 'FARMER-002',
      farmerName: 'Maria Santos',
      boxes: 3,
      receivedDate: '2026-09-10',
      currentStage: 'Completed',
      status: 'Returned to PTRI',
      lastUpdated: '2026-10-05',
      remarks: 'Cocoons successfully returned to PTRI.',
      mountingDate: '2026-09-28',
      harvestDate: '2026-10-03',
      harvestedWeight: 12.5,
      returnedWeight: 12.5,
      returnDate: '2026-10-05',
      returnConfirmed: true,
      silkwormQrCodeValue: 'SILKWORM-BATCH-SW-2026-003',
    },
  ];

  // SEPARATE COCOON RECORDS
  private cocoonRecords: CocoonHarvestRecord[] = [];

  // =====================================
  // GET SILKWORM BATCHES
  // =====================================

  getAllBatches(): SilkwormBatch[] {
    return this.batches.map(batch => ({ ...batch }));
  }

  getFarmerBatches(farmerUid: string): SilkwormBatch[] {
    return this.batches
      .filter(batch => batch.farmerUid === farmerUid)
      .map(batch => ({ ...batch }));
  }

  getBatchById(id: string): SilkwormBatch | undefined {
    const batch = this.batches.find(item => item.id === id);
    return batch ? { ...batch } : undefined;
  }

  getBatchByNumber(batchNumber: string): SilkwormBatch | undefined {
    const batch = this.batches.find(
      item => item.batchNumber === batchNumber
    );

    return batch ? { ...batch } : undefined;
  }

  // =====================================
  // CREATE SILKWORM BATCH - PTRI STAFF
  // =====================================

  createBatch(batch: SilkwormBatch): void {
    const newBatch: SilkwormBatch = {
      ...batch,
      silkwormQrCodeValue:
        batch.silkwormQrCodeValue ||
        `SILKWORM-${batch.batchNumber}`,
    };

    this.batches = [
      newBatch,
      ...this.batches,
    ];
  }

  // =====================================
  // FARMER STARTS REARING
  // =====================================

  startRearing(id: string): boolean {
    const batch = this.batches.find(item => item.id === id);

    if (!batch || batch.status !== 'Received') {
      return false;
    }

    batch.status = 'In Rearing';
    batch.currentStage = '1st Instar';
    batch.remarks = 'Farmer started rearing the silkworms.';
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // FARMER UPDATES SILKWORM STAGE
  // =====================================

  updateRearingProgress(
    id: string,
    stage: SilkwormStage,
    remarks: string
  ): boolean {
    const batch = this.batches.find(item => item.id === id);

    if (!batch || batch.status !== 'In Rearing') {
      return false;
    }

    batch.currentStage = stage;
    batch.remarks = remarks;
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // FARMER MARKS READY FOR HARVEST
  // =====================================

  markReadyForHarvest(
    id: string,
    remarks: string = 'Silkworms are ready for cocoon harvesting.'
  ): boolean {
    const batch = this.batches.find(item => item.id === id);

    if (
      !batch ||
      batch.status !== 'In Rearing'
    ) {
      return false;
    }

    batch.status = 'Ready for Harvest';
    batch.currentStage = 'Mounting';
    batch.remarks = remarks;
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // FARMER SUBMITS COCOON HARVEST FORM
  // GENERATES A SEPARATE COCOON QR VALUE
  // =====================================

  submitCocoonHarvest(
    batchId: string,
    harvestDetails: {
      harvestDate: string;
      harvestedWeight: number;
      cocoonQuantity?: number;
      cocoonCondition: string;
      remarks: string;
      expectedReturnDate?: string;
    }
  ): CocoonHarvestRecord | null {

    const batch = this.batches.find(
      item => item.id === batchId
    );

    if (
      !batch ||
      batch.status !== 'Ready for Harvest' ||
      harvestDetails.harvestedWeight <= 0 ||
      !harvestDetails.harvestDate
    ) {
      return null;
    }

    // Prevent duplicate harvest submissions
    if (batch.cocoonHarvestId) {
      return null;
    }

    const recordId = this.generateId('COCOON');
    const cocoonBatchNumber =
      `CC-${batch.batchNumber}`;

    const newRecord: CocoonHarvestRecord = {
      id: recordId,
      cocoonBatchNumber,

      silkwormBatchId: batch.id,
      silkwormBatchNumber: batch.batchNumber,

      farmerUid: batch.farmerUid,
      farmerName: batch.farmerName,

      harvestDate: harvestDetails.harvestDate,
      harvestedWeight: harvestDetails.harvestedWeight,
      cocoonQuantity: harvestDetails.cocoonQuantity,
      cocoonCondition: harvestDetails.cocoonCondition,
      remarks: harvestDetails.remarks,

      expectedReturnDate: harvestDetails.expectedReturnDate,

      // Unique cocoon QR value, separate from silkworm QR
      cocoonQrCodeValue: `COCOON-RETURN-${recordId}`,

      returnStatus: 'Pending Return',
      returnConfirmed: false,

      lastUpdated: this.getToday(),
    };

    this.cocoonRecords = [
      newRecord,
      ...this.cocoonRecords,
    ];

    // Update original silkworm batch
    batch.harvestDate = harvestDetails.harvestDate;
    batch.harvestedWeight = harvestDetails.harvestedWeight;
    batch.cocoonHarvestId = recordId;
    batch.cocoonQrCodeValue = newRecord.cocoonQrCodeValue;

    batch.currentStage = 'Cocoon Harvest';
    batch.status = 'Harvested';
    batch.remarks = 'Cocoon harvest form submitted. Awaiting return to PTRI.';
    batch.lastUpdated = this.getToday();

    return { ...newRecord };
  }

  // =====================================
  // GET COCOON RECORDS
  // =====================================

  getAllCocoonRecords(): CocoonHarvestRecord[] {
    return this.cocoonRecords.map(record => ({ ...record }));
  }

  getCocoonRecordsByFarmer(
    farmerUid: string
  ): CocoonHarvestRecord[] {
    return this.cocoonRecords
      .filter(record => record.farmerUid === farmerUid)
      .map(record => ({ ...record }));
  }

  getCocoonRecordById(
    id: string
  ): CocoonHarvestRecord | undefined {
    const record = this.cocoonRecords.find(
      item => item.id === id
    );

    return record ? { ...record } : undefined;
  }

  getCocoonRecordByQr(
    qrValue: string
  ): CocoonHarvestRecord | undefined {
    const record = this.cocoonRecords.find(
      item => item.cocoonQrCodeValue === qrValue
    );

    return record ? { ...record } : undefined;
  }

  // =====================================
  // FARMER SUBMITS COCOONS TO PTRI
  // =====================================

  submitCocoonReturn(
    cocoonRecordId: string,
    returnDate: string
  ): boolean {
    const record = this.cocoonRecords.find(
      item => item.id === cocoonRecordId
    );

    if (
      !record ||
      record.returnStatus !== 'Pending Return'
    ) {
      return false;
    }

    const batch = this.batches.find(
      item => item.id === record.silkwormBatchId
    );

    if (!batch) {
      return false;
    }

    record.returnDate = returnDate;
    record.returnStatus = 'Returned to PTRI';
    record.lastUpdated = this.getToday();

    batch.returnDate = returnDate;
    batch.status = 'Return Submitted';
    batch.remarks = 'Cocoons returned. Waiting for PTRI verification.';
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // PTRI CONFIRMS COCOON RECEIPT
  // =====================================

  confirmCocoonReturn(
    cocoonRecordId: string,
    actualReceivedWeight: number,
    receivingRemarks: string
  ): boolean {
    const record = this.cocoonRecords.find(
      item => item.id === cocoonRecordId
    );

    if (
      !record ||
      record.returnStatus !== 'Returned to PTRI' ||
      record.returnConfirmed ||
      actualReceivedWeight <= 0
    ) {
      return false;
    }

    const batch = this.batches.find(
      item => item.id === record.silkwormBatchId
    );

    if (!batch) {
      return false;
    }

    record.actualReceivedWeight = actualReceivedWeight;
    record.receivingRemarks = receivingRemarks;
    record.returnConfirmed = true;
    record.returnStatus = 'Confirmed';
    record.confirmedDate = this.getToday();
    record.lastUpdated = this.getToday();

    batch.returnedWeight = actualReceivedWeight;
    batch.returnConfirmed = true;
    batch.receivingRemarks = receivingRemarks;
    batch.status = 'Returned to PTRI';
    batch.currentStage = 'Completed';
    batch.remarks = 'Cocoon return confirmed by PTRI.';
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // QR LOOKUP - SILKWORM BATCH
  // =====================================

  getBatchByQr(qrValue: string): SilkwormBatch | undefined {
    const batch = this.batches.find(
      item => item.silkwormQrCodeValue === qrValue
    );

    return batch ? { ...batch } : undefined;
  }

  // =====================================
  // LEGACY METHODS
  // Kept to avoid breaking existing code
  // =====================================

  recordHarvest(
    id: string,
    harvestDate: string,
    harvestedWeight: number
  ): boolean {
    const result = this.submitCocoonHarvest(id, {
      harvestDate,
      harvestedWeight,
      cocoonCondition: 'Not specified',
      remarks: '',
    });

    return result !== null;
  }

  recordCocoonReturn(
    id: string,
    returnDate: string,
    returnedWeight: number
  ): boolean {
    const batch = this.batches.find(item => item.id === id);

    if (
      !batch ||
      batch.status !== 'Harvested' ||
      !batch.cocoonHarvestId
    ) {
      return false;
    }

    const record = this.cocoonRecords.find(
      item => item.id === batch.cocoonHarvestId
    );

    if (
      !record ||
      returnedWeight <= 0 ||
      returnedWeight > record.harvestedWeight
    ) {
      return false;
    }

    record.harvestedWeight = returnedWeight;
    batch.returnedWeight = returnedWeight;

    return this.submitCocoonReturn(record.id, returnDate);
  }

  updateBatchStatus(
    id: string,
    status: SilkwormStatus
  ): boolean {
    const batch = this.batches.find(item => item.id === id);

    if (!batch) {
      return false;
    }

    batch.status = status;
    batch.lastUpdated = this.getToday();

    return true;
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
  }

  private getToday(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
