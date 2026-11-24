
import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import {
  SilkwormRequestService,
  SilkwormBatch
} from './silkworm-request.service';

// =====================================
// COCOON RETURN STATUS
// =====================================

export type CocoonReturnStatus =
  | 'Pending Return'
  | 'Submitted'
  | 'Received';

// =====================================
// COCOON HARVEST RECORD
// =====================================

export interface CocoonHarvestRecord {
  id: string;
  harvestNumber: string;

  batchId: string;
  batchNumber: string;
  requestId: string;
  requestNumber: string;

  farmerUid: string;
  farmerName: string;

  silkwormType: string;
  breed: string;
  assignedTrays: number;
  assignedQuantity: number;

  harvestDate: string;
  harvestedWeight: number;
  cocoonQuantity: number;
  cocoonCondition: string;
  remarks: string;
  expectedReturnDate: string | null;

  returnStatus: CocoonReturnStatus;
  returnRecordIds: string[];

  createdAt: string;
}

// =====================================
// COCOON RETURN RECORD
// =====================================

export interface CocoonReturnRecord {
  id: string;
  returnNumber: string;
  qrValue?: string;

  harvestId: string;
  harvestNumber: string;

  batchId: string;
  batchNumber: string;
  requestId: string;
  requestNumber: string;

  farmerUid: string;
  farmerName: string;

  harvestDate: string;
  returnDate: string;
  cocoonWeight: number;
  cocoonQuantity: number;
  cocoonCondition: string;
  farmerRemarks: string;

  status: 'Submitted' | 'Received';
  actualReceivedWeight: number | null;
  actualReceivedQuantity: number | null;
  ptriRemarks: string;

  createdAt: string;
}

// =====================================
// HARVEST FORM DATA
// =====================================

export interface CocoonHarvestData {
  harvestDate: string;
  harvestedWeight: number;
  cocoonQuantity?: number;
  cocoonCondition: string;
  remarks: string;
  expectedReturnDate?: string;
}

// =====================================
// SERVICE
// =====================================

@Injectable({
  providedIn: 'root'
})
export class CocoonProductionService {

  private readonly harvestCollection = 'cocoon-harvests';
  private readonly returnCollection = 'cocoon-returns';
  private readonly batchCollection = 'silkworm-batches';

  constructor(
    private silkwormRequestService: SilkwormRequestService
  ) {}

  // =====================================
  // GET FARMER'S WORM BATCHES
  // =====================================

  async getFarmerBatches(
    farmerUid: string
  ): Promise<SilkwormBatch[]> {

    if (!farmerUid?.trim()) return [];

    return this.silkwormRequestService.getFarmerBatches(farmerUid);
  }

  // =====================================
  // GET BATCHES AVAILABLE FOR HARVEST
  // =====================================

  async getEligibleHarvestBatches(
    farmerUid: string
  ): Promise<SilkwormBatch[]> {

    if (!farmerUid?.trim()) return [];

    const batches = await this.getFarmerBatches(farmerUid);
    const allowedStatuses = ['Assigned', 'Delivered', 'Received'];

    return batches.filter(batch =>
      allowedStatuses.includes(batch.status)
    );
  }

  // =====================================
  // GET FARMER'S HARVEST RECORDS
  // =====================================

  async getFarmerHarvestRecords(
    farmerUid: string
  ): Promise<CocoonHarvestRecord[]> {

    if (!farmerUid?.trim()) return [];

    const harvestQuery = query(
      collection(db, this.harvestCollection),
      where('farmerUid', '==', farmerUid)
    );

    const snapshot = await getDocs(harvestQuery);

    return snapshot.docs
      .map(document => ({
        ...document.data(),
        id: document.id
      } as CocoonHarvestRecord))
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }

  // =====================================
  // GET HARVEST RECORD BY ID
  // =====================================

  async getHarvestRecordById(
    recordId: string,
    farmerUid?: string
  ): Promise<CocoonHarvestRecord | null> {

    if (!recordId?.trim()) return null;

    const recordRef = doc(db, this.harvestCollection, recordId);
    const snapshot = await getDoc(recordRef);

    if (!snapshot.exists()) return null;

    const record = {
      ...snapshot.data(),
      id: snapshot.id
    } as CocoonHarvestRecord;

    if (farmerUid && record.farmerUid !== farmerUid) {
      throw new Error('You are not authorized to view this harvest record.');
    }

    return record;
  }

  // =====================================
  // RECORD COCOON HARVEST
  // =====================================

  async recordHarvest(
    batchId: string,
    farmerUid: string,
    harvestDetails: CocoonHarvestData
  ): Promise<CocoonHarvestRecord> {

    if (!batchId?.trim() || !farmerUid?.trim()) {
      throw new Error('Invalid worm batch information.');
    }

    if (
      !harvestDetails.harvestDate ||
      !Number.isFinite(harvestDetails.harvestedWeight) ||
      harvestDetails.harvestedWeight <= 0 ||
      !Number.isInteger(harvestDetails.cocoonQuantity ?? 0) ||
      (harvestDetails.cocoonQuantity ?? 0) < 0 ||
      !harvestDetails.cocoonCondition?.trim()
    ) {
      throw new Error('Please provide valid cocoon harvest details.');
    }

    if (
      harvestDetails.expectedReturnDate &&
      harvestDetails.expectedReturnDate < harvestDetails.harvestDate
    ) {
      throw new Error('Expected return date cannot be earlier than harvest date.');
    }

    const batchRef = doc(db, this.batchCollection, batchId);
    const harvestRef = doc(collection(db, this.harvestCollection));

    const now = new Date().toISOString();

    const harvestNumber =
      `CH-${new Date().getFullYear()}-${harvestRef.id.slice(-6).toUpperCase()}`;

    let newRecord!: CocoonHarvestRecord;

    await runTransaction(db, async transaction => {

      const batchSnapshot = await transaction.get(batchRef);

      if (!batchSnapshot.exists()) {
        throw new Error('The original PTRI worm batch could not be found.');
      }

      const batch = batchSnapshot.data() as SilkwormBatch;

      if (batch.farmerUid !== farmerUid) {
        throw new Error('You are not authorized to record this worm batch.');
      }

      const allowedStatuses = ['Assigned', 'Delivered', 'Received'];

      if (!allowedStatuses.includes(batch.status)) {
        throw new Error('This worm batch is not available for cocoon harvest recording.');
      }

      newRecord = {
        id: harvestRef.id,
        harvestNumber,

        batchId: batch.id,
        batchNumber: batch.batchNumber,
        requestId: batch.requestId,
        requestNumber: batch.requestNumber,

        farmerUid: batch.farmerUid,
        farmerName: batch.farmerName,

        silkwormType: batch.silkwormType,
        breed: batch.breed,
        assignedTrays: batch.trays,
        assignedQuantity: batch.quantity,

        harvestDate: harvestDetails.harvestDate,
        harvestedWeight: harvestDetails.harvestedWeight,
        cocoonQuantity: harvestDetails.cocoonQuantity ?? 0,
        cocoonCondition: harvestDetails.cocoonCondition.trim(),
        remarks: harvestDetails.remarks?.trim() || '',
        expectedReturnDate: harvestDetails.expectedReturnDate || null,

        returnStatus: 'Pending Return',
        returnRecordIds: [],

        createdAt: now
      };

      transaction.set(harvestRef, newRecord);
    });

    return newRecord;
  }

  // =====================================
  // GET HARVESTS WAITING FOR RETURN
  // =====================================

  async getReturnEligibleRecords(
    farmerUid: string
  ): Promise<CocoonHarvestRecord[]> {

    if (!farmerUid?.trim()) return [];

    const records = await this.getFarmerHarvestRecords(farmerUid);

    return records.filter(record =>
      record.returnStatus === 'Pending Return'
    );
  }

  // =====================================
  // GET FARMER'S COCOON RETURN HISTORY
  // =====================================

  async getFarmerReturnRecords(
    farmerUid: string
  ): Promise<CocoonReturnRecord[]> {

    if (!farmerUid?.trim()) return [];

    const returnQuery = query(
      collection(db, this.returnCollection),
      where('farmerUid', '==', farmerUid)
    );

    const snapshot = await getDocs(returnQuery);

    return snapshot.docs
      .map(document => ({
        ...document.data(),
        id: document.id
      } as CocoonReturnRecord))
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }

  // =====================================
  // GET ALL COCOON RETURNS FOR PTRI STAFF
  // =====================================

  async getAllReturnRecordsForStaff(): Promise<CocoonReturnRecord[]> {

    const returnQuery = query(
      collection(db, this.returnCollection)
    );

    const snapshot = await getDocs(returnQuery);

    return snapshot.docs
      .map(document => ({
        ...document.data(),
        id: document.id
      } as CocoonReturnRecord))
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }

  // =====================================
  // SUBMIT COCOON RETURN
  // PRESERVES THE ORIGINAL SECURE TOKEN
  // =====================================

  async submitReturn(
    harvestId: string,
    farmerUid: string,
    returnDate: string
  ): Promise<CocoonReturnRecord> {

    if (
      !harvestId?.trim() ||
      !farmerUid?.trim() ||
      !returnDate
    ) {
      throw new Error('Please provide valid cocoon return information.');
    }

    const submitCocoonReturnCall = httpsCallable<
      {
        harvestId: string;
        returnDate: string;
      },
      {
        success: boolean;
        token: string;
        returnRecord: Omit<CocoonReturnRecord, 'qrValue'>;
      }
    >(functions, 'submitCocoonReturn');

    const response = await submitCocoonReturnCall({
      harvestId,
      returnDate
    });

    const result = response.data;

    if (
      !result.success ||
      !result.token ||
      !result.returnRecord
    ) {
      throw new Error('Unable to submit the cocoon return. Please try again.');
    }

    if (!/^[a-f0-9]{64}$/i.test(result.token)) {
      throw new Error('The secure QR token returned by PTRI is invalid.');
    }

    const qrValue = this.createQrValue(result.token);

    return {
      ...result.returnRecord,
      qrValue
    };
  }

  // =====================================
  // CREATE FARMER QR VALUE
  // =====================================

  private createQrValue(token: string): string {
    return `${window.location.origin}/cocoon-return/${token}`;
  }

  // =====================================
  // EXTRACT ORIGINAL TOKEN FROM QR
  // =====================================

  private extractTokenFromQrValue(qrValue: string): string | null {

    const value = qrValue.trim();

    if (!value) return null;

    // Raw token.
    if (/^[a-f0-9]{64}$/i.test(value)) {
      return value.toLowerCase();
    }

    try {
      const parsedUrl = new URL(value, window.location.origin);

      // Query token format.
      const queryToken = parsedUrl.searchParams.get('token');

      if (queryToken && /^[a-f0-9]{64}$/i.test(queryToken)) {
        return queryToken.toLowerCase();
      }

      // Path token format.
      const pathParts = parsedUrl.pathname
        .split('/')
        .filter(Boolean);

      const returnIndex = pathParts.findIndex(
        part => part.toLowerCase() === 'cocoon-return'
      );

      if (returnIndex >= 0) {
        const pathToken = pathParts[returnIndex + 1];

        if (pathToken && /^[a-f0-9]{64}$/i.test(pathToken)) {
          return pathToken.toLowerCase();
        }
      }

    } catch {
      return null;
    }

    return null;
  }

  // =====================================
  // HASH ORIGINAL TOKEN USING SHA-256
  // =====================================

  private async hashQrToken(token: string): Promise<string> {

    if (!globalThis.crypto?.subtle) {
      throw new Error(
        'Secure QR scanning requires HTTPS or localhost.'
      );
    }

    const encodedToken = new TextEncoder().encode(token);

    const hashBuffer = await globalThis.crypto.subtle.digest(
      'SHA-256',
      encodedToken
    );

    return Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // =====================================
  // STAFF: FIND ACTUAL RETURN USING QR
  // =====================================

  async getReturnRecordByQr(
    qrValue: string,
    _farmerUid?: string
  ): Promise<CocoonReturnRecord | null> {

    if (!qrValue?.trim()) {
      throw new Error('No QR code value was detected.');
    }

    const token = this.extractTokenFromQrValue(qrValue);

    if (!token) {
      throw new Error('Invalid cocoon return QR code.');
    }

    const tokenHash = await this.hashQrToken(token);

    const returnQuery = query(
      collection(db, this.returnCollection),
      where('tokenHash', '==', tokenHash)
    );

    const snapshot = await getDocs(returnQuery);

    if (snapshot.empty) {
      return null;
    }

    if (snapshot.size > 1) {
      throw new Error(
        'Multiple cocoon return records matched this QR token. Please contact the system administrator.'
      );
    }

    const matchedDocument = snapshot.docs[0];
    const data = matchedDocument.data();

    if (
      !data['farmerUid'] ||
      !data['returnNumber'] ||
      !data['harvestId']
    ) {
      throw new Error(
        'The scanned QR matched an incomplete cocoon return record.'
      );
    }

    return {
      ...data,
      id: matchedDocument.id
    } as CocoonReturnRecord;
  }

  // =====================================
  // COMPATIBILITY ALIAS
  // =====================================

  async getHarvestRecordByQr(
    qrValue: string,
    farmerUid?: string
  ): Promise<CocoonReturnRecord | null> {

    return this.getReturnRecordByQr(qrValue, farmerUid);
  }


  // =====================================
  // STAFF: FIND COCOON RETURN BY RETURN NUMBER
  // =====================================

  async getReturnRecordByNumber(
    returnNumber: string
  ): Promise<CocoonReturnRecord | null> {

    const value = returnNumber?.trim().toUpperCase();

    if (!value) {
      throw new Error('Please enter a cocoon return number.');
    }

    if (!/^CR-\d{4}-[A-Z0-9]+$/.test(value)) {
      throw new Error('Invalid cocoon return number format.');
    }

    const returnQuery = query(
      collection(db, this.returnCollection),
      where('returnNumber', '==', value)
    );

    const snapshot = await getDocs(returnQuery);

    if (snapshot.empty) {
      return null;
    }

    if (snapshot.size > 1) {
      throw new Error(
        'Multiple cocoon return records matched this return number. Please contact the system administrator.'
      );
    }

    const matchedDocument = snapshot.docs[0];
    const data = matchedDocument.data();

    if (
      !data['farmerUid'] ||
      !data['returnNumber'] ||
      !data['harvestId']
    ) {
      throw new Error(
        'The matched cocoon return record is incomplete.'
      );
    }

    return {
      ...data,
      id: matchedDocument.id
    } as CocoonReturnRecord;
  }


  // =====================================
  // GET COCOON RETURN RECORD BY ID
  // =====================================

  async getReturnRecordById(
    returnId: string,
    farmerUid?: string
  ): Promise<CocoonReturnRecord | null> {

    if (!returnId?.trim()) return null;

    const returnRef = doc(db, this.returnCollection, returnId);
    const snapshot = await getDoc(returnRef);

    if (!snapshot.exists()) return null;

    const record = {
      ...snapshot.data(),
      id: snapshot.id
    } as CocoonReturnRecord;

    if (farmerUid && record.farmerUid !== farmerUid) {
      throw new Error('You are not authorized to view this cocoon return.');
    }

    return record;
  }

  // =====================================
  // GET ALL HARVEST RECORDS FOR PTRI STAFF
  // =====================================

  async getAllHarvestRecordsForStaff(): Promise<CocoonHarvestRecord[]> {

    const harvestQuery = query(
      collection(db, this.harvestCollection)
    );

    const snapshot = await getDocs(harvestQuery);

    return snapshot.docs
      .map(document => ({
        ...document.data(),
        id: document.id
      } as CocoonHarvestRecord))
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }


}
