
import { Injectable } from '@angular/core';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type ProductionActivityType =
  | 'leaf-availability'
  | 'mulberry-pruning'
  | 'silkworm-rearing'
  | 'cocoon-harvest'
  | 'legacy';

export interface FarmerProductionRecord {
  id?: string;

  // FARMER INFORMATION
  farmerUid: string;
  farmerName: string;
  farmName: string;

  // ACTIVITY TYPE
  activityType?: ProductionActivityType;
  productionType: string;

  // LEGACY / GENERAL PRODUCTION FIELDS
  // Optional so new activity records do not require irrelevant fields.
  quantity?: number;
  unit?: string;
  expectedAvailability?: string;

  // GENERAL NOTES
  notes: string;

  // MULBERRY LEAF AVAILABILITY
  availableLeafCount?: number;
  leafReportDate?: string;

  // MULBERRY PRUNING
  pruningDate?: string;
  pruningCycleDays?: number;

  // SILKWORM REARING
  batchReference?: string;
  hatchDate?: string;
  silkwormCount?: number;
  boxCount?: number;
  instar?: string;
  expectedMountingDate?: string;
  expectedCocoonReturnDate?: string;

  // COCOON HARVEST
  harvestDate?: string;
  cocoonQuantity?: number;
  cocoonUnit?: string;
  expectedDeliveryDate?: string;

  // REVIEW STATUS
  status: 'Pending Review' | 'Reviewed';

  createdAt?: unknown;
  updatedAt?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class FarmerProductionService {

  private readonly productionCollection = collection(
    db,
    'farmer-production'
  );

  // GET PRODUCTION RECORDS FOR ONE FARMER
  async getFarmerProductions(
    farmerUid: string
  ): Promise<FarmerProductionRecord[]> {

    const productionQuery = query(
      this.productionCollection,
      where('farmerUid', '==', farmerUid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(productionQuery);

    return snapshot.docs.map(productionDoc => ({
      id: productionDoc.id,
      ...productionDoc.data()
    })) as FarmerProductionRecord[];
  }

  // GET ALL FARMERS' PRODUCTION RECORDS FOR PTRI STAFF
  async getAllProductions(): Promise<FarmerProductionRecord[]> {

    const productionQuery = query(
      this.productionCollection,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(productionQuery);

    return snapshot.docs.map(productionDoc => ({
      id: productionDoc.id,
      ...productionDoc.data()
    })) as FarmerProductionRecord[];
  }

  // UPDATE PRODUCTION REVIEW STATUS
  async updateProductionStatus(
    productionId: string,
    status: 'Pending Review' | 'Reviewed'
  ): Promise<void> {

    const productionRef = doc(
      db,
      'farmer-production',
      productionId
    );

    await updateDoc(productionRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }

  // ADD A NEW ACTIVITY RECORD
  async addProduction(
    production: Omit<FarmerProductionRecord, 'id' | 'createdAt'>
  ): Promise<string> {

    const result = await addDoc(
      this.productionCollection,
      {
        ...production,
        createdAt: serverTimestamp()
      }
    );

    return result.id;
  }
}
