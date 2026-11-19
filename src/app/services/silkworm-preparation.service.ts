
import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type PreparationStatus =
  | 'Scheduled'
  | 'Preparing'
  | 'Ready for Delivery'
  | 'Cancelled';

export interface SilkwormPreparationBatch {
  id: string;
  batchCode: string;
  farmerId: string;
  farmerUid: string;
  farmerName: string;
  farmerType: 'Individual' | 'Community';
  communityName?: string;
  pruningRecordId: string;
  pruningStartDate: string;
  pruningEndDate: string;
  preparationStartDate: string;
  expectedReadyDate: string;
  boxQuantity: number;
  remarks: string;
  status: PreparationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class SilkwormPreparationService {
  private readonly preparationCollection =
    collection(db, 'silkworm-preparation');

  async getPreparationBatches(): Promise<SilkwormPreparationBatch[]> {
    const snapshot = await getDocs(this.preparationCollection);

    return snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    })) as SilkwormPreparationBatch[];
  }

  async addPreparationBatch(
    batch: Omit<
      SilkwormPreparationBatch,
      'id' | 'batchCode' | 'createdAt' | 'updatedAt'
    >
  ): Promise<string> {
    const batchCode = `PREP-${Date.now()}`;

    const result = await addDoc(this.preparationCollection, {
      ...batch,
      batchCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return result.id;
  }

  async updatePreparationStatus(
    id: string,
    status: PreparationStatus
  ): Promise<void> {
    await updateDoc(doc(this.preparationCollection, id), {
      status,
      updatedAt: serverTimestamp()
    });
  }
}
