
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
  status?: 'Scheduled' | 'In Progress' | 'Completed';
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

  // Get today's local date.
  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Validate a YYYY-MM-DD date.
  private isValidStartDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  // Automatically calculate End Pruning 45 days after Start Pruning.
  private calculateEndDate(startDate: string): string {
    const [year, month, day] = startDate.split('-').map(Number);
    const endDate = new Date(year, month - 1, day);

    endDate.setDate(endDate.getDate() + this.cycleDays);

    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');

    return `${endYear}-${endMonth}-${endDay}`;
  }

  // Determine the correct status based on the pruning dates.
  private getExpectedStatus(
    startDate: string,
    endDate: string,
    today: string
  ): 'Scheduled' | 'In Progress' | 'Completed' {
    if (startDate > today) {
      return 'Scheduled';
    }

    if (endDate <= today) {
      return 'Completed';
    }

    return 'In Progress';
  }

  // Synchronize saved pruning statuses with their dates.
  private async synchronizeStatuses(
    records: MulberryPruningRecord[]
  ): Promise<MulberryPruningRecord[]> {
    const today = this.getToday();

    const updatedRecords = await Promise.all(
      records.map(async record => {
        const startDate = record.startDate || record.pruningDate;

        if (!record.id || !startDate || !this.isValidStartDate(startDate)) {
          return record;
        }

        const endDate =
          record.endDate && this.isValidStartDate(record.endDate)
            ? record.endDate
            : this.calculateEndDate(startDate);

        const expectedStatus = this.getExpectedStatus(
          startDate,
          endDate,
          today
        );

        if (record.status !== expectedStatus) {
          await updateDoc(doc(this.pruningCollection, record.id), {
            status: expectedStatus
          });
        }

        return {
          ...record,
          endDate,
          status: expectedStatus
        };
      })
    );

    return updatedRecords;
  }

  // Start or schedule a pruning cycle using the farmer-selected date.
  async startPruning(
    farmerUid: string,
    selectedStartDate: string
  ): Promise<string> {
    if (!farmerUid) {
      throw new Error('Farmer account not found.');
    }

    if (!selectedStartDate || !this.isValidStartDate(selectedStartDate)) {
      throw new Error('Please select a valid Start Pruning date.');
    }

    // Load and synchronize existing cycles first.
    const records = await this.getFarmerPruningRecords(farmerUid);

    // Only one scheduled or ongoing cycle is allowed at a time.
    const existingCycle = records.find(record =>
      record.status === 'Scheduled' ||
      record.status === 'In Progress'
    );

    if (existingCycle) {
      throw new Error(
        'You already have a scheduled or ongoing pruning cycle. Complete the current cycle before creating another one.'
      );
    }

    const startDate = selectedStartDate;
    const endDate = this.calculateEndDate(startDate);
    const today = this.getToday();

    const status = this.getExpectedStatus(
      startDate,
      endDate,
      today
    );

    const docRef = await addDoc(this.pruningCollection, {
      farmerUid,
      startDate,
      endDate,
      status,
      cycleDays: this.cycleDays,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  }

  // Retrieve and synchronize the farmer's pruning records.
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

    return this.synchronizeStatuses(records);
  }

  // Retrieve all pruning records for PTRI Staff monitoring.
  async getAllPruningRecords(): Promise<MulberryPruningRecord[]> {
    const snapshot = await getDocs(this.pruningCollection);

    const records = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    })) as MulberryPruningRecord[];

    return this.synchronizeStatuses(records);
  }
}
