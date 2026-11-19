
import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface MulberryPruningRecord {
  id?: string;
  farmerUid: string;
  startDate?: string;
  endDate?: string;
  status?: 'In Progress' | 'Completed';
  cycleDays: number;

  // Legacy fields: preserve existing records
  pruningDate?: string;
  hillId?: string;
  hillReference?: string;
  notes?: string;
  createdAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class MulberryProductionService {
  private pruningCollection = collection(db, 'mulberry-pruning-records');

  private readonly cycleDays = 45;

  // Get the current local date in YYYY-MM-DD format.
  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Automatically calculate the End Pruning date.
  private calculateEndDate(startDate: string): string {
    const [year, month, day] = startDate.split('-').map(Number);

    const endDate = new Date(year, month - 1, day);
    endDate.setDate(endDate.getDate() + this.cycleDays);

    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');

    return `${endYear}-${endMonth}-${endDay}`;
  }

  // Start a new pruning cycle using today's date automatically.
  // The optional second parameter is retained temporarily
  // for compatibility with the previous component version.
  async startPruning(
    farmerUid: string,
    _unusedStartDate?: string
  ): Promise<string> {
    const records = await this.getFarmerPruningRecords(farmerUid);

    const today = this.getToday();

    const activeCycle = records.find(record =>
      record.status === 'In Progress' &&
      (!record.endDate || record.endDate >= today)
    );

    if (activeCycle) {
      throw new Error('You already have an ongoing pruning cycle.');
    }

    const startDate = today;
    const endDate = this.calculateEndDate(startDate);

    const docRef = await addDoc(this.pruningCollection, {
      farmerUid,
      startDate,
      endDate,
      status: 'In Progress',
      cycleDays: this.cycleDays,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  }

  // Retrieve pruning records and automatically complete
  // cycles whose calculated End Pruning date has arrived.
  async getFarmerPruningRecords(
    farmerUid: string
  ): Promise<MulberryPruningRecord[]> {
    const q = query(
      this.pruningCollection,
      where('farmerUid', '==', farmerUid)
    );

    const snapshot = await getDocs(q);

    const records = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    })) as MulberryPruningRecord[];

    const today = this.getToday();

    const expiredCycles = records.filter(record =>
      record.id &&
      record.status === 'In Progress' &&
      !!record.endDate &&
      record.endDate <= today
    );

    // Update expired cycles in Firestore.
    await Promise.all(
      expiredCycles.map(record =>
        updateDoc(doc(this.pruningCollection, record.id!), {
          status: 'Completed'
        })
      )
    );

    // Reflect the updated status in the returned records.
    return records.map(record => {
      if (
        record.status === 'In Progress' &&
        record.endDate &&
        record.endDate <= today
      ) {
        return {
          ...record,
          status: 'Completed'
        };
      }

      return record;
    });
  }

    // Retrieve pruning records from all farmers for Staff monitoring.
  async getAllPruningRecords(): Promise<MulberryPruningRecord[]> {
    const snapshot = await getDocs(this.pruningCollection);

    const records = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    })) as MulberryPruningRecord[];

    const today = this.getToday();

    const expiredCycles = records.filter(record =>
      record.id &&
      record.status === 'In Progress' &&
      !!record.endDate &&
      record.endDate <= today
    );

    await Promise.all(
      expiredCycles.map(record =>
        updateDoc(doc(this.pruningCollection, record.id!), {
          status: 'Completed'
        })
      )
    );

    return records.map(record => {
      if (
        record.status === 'In Progress' &&
        record.endDate &&
        record.endDate <= today
      ) {
        return { ...record, status: 'Completed' as const };
      }

      return record;
    });
  }
}
