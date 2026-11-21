
import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  where,
  query,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export type SilkwormRequestStatus =
  | 'Pending'
  | 'Worms Assigned'
  // Legacy statuses retained for compatibility with older records.
  | 'Under Review'
  | 'Approved'
  | 'Partially Approved'
  | 'Rejected';

export interface SilkwormRequest {
  id: string;
  requestNumber: string;
  farmerUid: string;
  farmerName: string;
  livingMulberryHills: number;
  availableLeafWeightKg: number;
  approvedTrays: number | null;
  assignedTrays?: number | null;
  farmerRemarks: string;
  ptriRemarks: string;
  status: SilkwormRequestStatus;
  requestDate: string;
  reviewedDate: string | null;
  allocatedDate: string | null;
  linkedBatchIds: string[];
}

export interface SilkwormBatch {
  id: string;
  batchNumber: string;
  requestId: string;
  requestNumber: string;
  farmerUid: string;
  farmerName: string;

  // Farm information at the time of assignment
  farmArea: string;
  registeredMulberryTreeCount: number;
  livingMulberryHills: number;
  availableLeafWeightKg: number;

  // Assigned silkworm details
  silkwormType: string;
  breed: string;
  trays: number;
  quantity: number;
  preparationDate: string;
  deliveryDate: string;
  ptriRemarks: string;

  // Batch tracking
  status: 'Assigned' | 'Delivered' | 'Received';
  qrValue: string;
  assignedDate: string;
}

export interface AssignWormsData {
  silkwormType: string;
  breed: string;
  trays: number;
  quantity: number;
  preparationDate: string;
  deliveryDate: string;
  ptriRemarks: string;
  farmArea: string;
  registeredMulberryTreeCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class SilkwormRequestService {
  private readonly collectionName = 'silkworm-requests';
  private readonly batchCollectionName = 'silkworm-batches';

  async createRequest(
    request: Pick<
      SilkwormRequest,
      | 'farmerUid'
      | 'farmerName'
      | 'livingMulberryHills'
      | 'availableLeafWeightKg'
      | 'farmerRemarks'
    >
  ): Promise<string> {
    const requestRef = doc(collection(db, this.collectionName));

    const requestNumber =
      `SWR-${new Date().getFullYear()}-${requestRef.id.slice(-6).toUpperCase()}`;

    const newRequest: SilkwormRequest = {
      ...request,
      id: requestRef.id,
      requestNumber,
      approvedTrays: null,
      assignedTrays: null,
      ptriRemarks: '',
      status: 'Pending',
      requestDate: new Date().toISOString(),
      reviewedDate: null,
      allocatedDate: null,
      linkedBatchIds: []
    };

    await setDoc(requestRef, newRequest);
    return requestRef.id;
  }

  async getFarmerRequests(
    farmerUid: string
  ): Promise<SilkwormRequest[]> {
    const requestQuery = query(
      collection(db, this.collectionName),
      where('farmerUid', '==', farmerUid)
    );

    const snapshot = await getDocs(requestQuery);

    return snapshot.docs
      .map(document => document.data() as SilkwormRequest)
      .sort(
        (a, b) =>
          new Date(b.requestDate).getTime() -
          new Date(a.requestDate).getTime()
      );
  }

  // PTRI Staff: Retrieve all farmer requests.
  async getAllRequests(): Promise<SilkwormRequest[]> {
    const snapshot = await getDocs(
      collection(db, this.collectionName)
    );

    return snapshot.docs
      .map(document => document.data() as SilkwormRequest)
      .sort(
        (a, b) =>
          new Date(b.requestDate).getTime() -
          new Date(a.requestDate).getTime()
      );
  }

  // PTRI Staff: Retrieve all assigned silkworm batches.
  async getAllBatches(): Promise<SilkwormBatch[]> {
    const snapshot = await getDocs(
      collection(db, this.batchCollectionName)
    );

    return snapshot.docs
      .map(document => document.data() as SilkwormBatch)
      .sort(
        (a, b) =>
          new Date(b.assignedDate).getTime() -
          new Date(a.assignedDate).getTime()
      );
  }

  // Retrieve one batch using its Firestore document ID.
  async getBatchById(
    batchId: string
  ): Promise<SilkwormBatch | null> {
    if (!batchId.trim()) {
      throw new Error('Invalid batch ID.');
    }

    const batchRef = doc(
      db,
      this.batchCollectionName,
      batchId
    );

    const snapshot = await getDoc(batchRef);

    return snapshot.exists()
      ? snapshot.data() as SilkwormBatch
      : null;
  }

  // PTRI Staff: Directly assign worms and create the actual batch.
  async assignWorms(
    request: SilkwormRequest,
    data: AssignWormsData
  ): Promise<SilkwormBatch> {
    if (!request.id?.trim()) {
      throw new Error('Invalid farmer request.');
    }

    if (
      !data.silkwormType.trim() ||
      !data.breed.trim() ||
      !data.preparationDate ||
      !data.deliveryDate
    ) {
      throw new Error('Please complete all required assignment details.');
    }

    if (
      !Number.isInteger(data.trays) ||
      data.trays <= 0 ||
      !Number.isInteger(data.quantity) ||
      data.quantity <= 0
    ) {
      throw new Error('Trays and silkworm quantity must be positive whole numbers.');
    }

    if (data.deliveryDate < data.preparationDate) {
      throw new Error('Delivery date cannot be earlier than preparation date.');
    }

    const requestRef = doc(
      db,
      this.collectionName,
      request.id
    );

    const batchRef = doc(
      collection(db, this.batchCollectionName)
    );

    const now = new Date().toISOString();
    const batchNumber =
      `SWB-${new Date().getFullYear()}-${batchRef.id.slice(-6).toUpperCase()}`;

    const newBatch: SilkwormBatch = {
      id: batchRef.id,
      batchNumber,
      requestId: request.id,
      requestNumber: request.requestNumber,
      farmerUid: request.farmerUid,
      farmerName: request.farmerName,

      farmArea: data.farmArea,
      registeredMulberryTreeCount:
        data.registeredMulberryTreeCount,
      livingMulberryHills: request.livingMulberryHills,
      availableLeafWeightKg: request.availableLeafWeightKg,

      silkwormType: data.silkwormType.trim(),
      breed: data.breed.trim(),
      trays: data.trays,
      quantity: data.quantity,
      preparationDate: data.preparationDate,
      deliveryDate: data.deliveryDate,
      ptriRemarks: data.ptriRemarks.trim(),

      status: 'Assigned',
      qrValue: `PTRI-BATCH:${batchRef.id}`,
      assignedDate: now
    };

    await runTransaction(db, async transaction => {
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error('The farmer request could not be found.');
      }

      const currentRequest =
        requestSnapshot.data() as SilkwormRequest;

      if (currentRequest.status === 'Worms Assigned') {
        throw new Error('Worms have already been assigned to this request.');
      }

      if (currentRequest.status === 'Rejected') {
        throw new Error('This request is not available for assignment.');
      }

      const linkedBatchIds = [
        ...(currentRequest.linkedBatchIds || []),
        batchRef.id
      ];

      transaction.set(batchRef, newBatch);

      transaction.update(requestRef, {
        status: 'Worms Assigned',
        assignedTrays: data.trays,
        // Retained for compatibility with existing farmer-side code.
        approvedTrays: data.trays,
        ptriRemarks: data.ptriRemarks.trim(),
        reviewedDate: now,
        allocatedDate: now,
        linkedBatchIds
      });
    });

    return newBatch;
  }
  // FARMER: Retrieve only batches assigned to the logged-in farmer.
async getFarmerBatches(
  farmerUid: string
): Promise<SilkwormBatch[]> {
  const batchQuery = query(
    collection(db, this.batchCollectionName),
    where('farmerUid', '==', farmerUid)
  );

  const snapshot = await getDocs(batchQuery);

  return snapshot.docs
    .map(document => document.data() as SilkwormBatch)
    .sort(
      (a, b) =>
        new Date(b.assignedDate).getTime() -
        new Date(a.assignedDate).getTime()
    );
}

// FARMER: Confirm receipt only after PTRI marks the batch as Delivered.
async confirmBatchReceipt(
  batchId: string,
  farmerUid: string
): Promise<void> {
  if (!batchId.trim() || !farmerUid.trim()) {
    throw new Error('Invalid batch information.');
  }

  const batchRef = doc(
    db,
    this.batchCollectionName,
    batchId
  );

  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(batchRef);

    if (!snapshot.exists()) {
      throw new Error('The assigned batch could not be found.');
    }

    const batch = snapshot.data() as SilkwormBatch;

    if (batch.farmerUid !== farmerUid) {
      throw new Error('You are not authorized to confirm this batch.');
    }

    if (batch.status !== 'Delivered') {
      throw new Error('You can only confirm a batch after PTRI marks it as Delivered.');
    }

    transaction.update(batchRef, {
      status: 'Received'
    });
  });
}
}
