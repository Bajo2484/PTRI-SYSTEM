import { Injectable } from '@angular/core';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

import { db } from './firebase';

export interface FarmerProductionRecord {
  id?: string;
  farmerUid: string;
  farmerName: string;
  farmName: string;
  productionType: string;
  quantity: number;
  unit: string;
  expectedAvailability: string;
  notes: string;
  status: 'Pending Review' | 'Approved' | 'Revision Requested';
  createdAt?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class FarmerProductionService {

  private readonly productionCollection =
    collection(db, 'farmer-production');

  async getFarmerProductions(
    farmerUid: string
  ): Promise<FarmerProductionRecord[]> {

    const productionQuery = query(
      this.productionCollection,
      where('farmerUid', '==', farmerUid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(productionQuery);

    return snapshot.docs.map((productionDoc) => ({
      id: productionDoc.id,
      ...productionDoc.data()
    })) as FarmerProductionRecord[];
  }

  async addProduction(
    production: Omit<FarmerProductionRecord, 'id' | 'createdAt'>
  ): Promise<string> {

    const result = await addDoc(this.productionCollection, {
      ...production,
      createdAt: serverTimestamp()
    });

    return result.id;
  }
}