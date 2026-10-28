import { FarmerCacheService } from '../cache/farmer-cache.service';
import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';

import {
  farmerCreationAuth,
  db
} from './firebase';

export interface FarmerAccount {
  id: string;
  fullName: string;
  locality: string;
  phone: string;
  email: string;
  username: string;
  authUid?: string;
  farmName: string;
  farmArea: string;
  supplyCommitment: number;
  status: 'Active' | 'Pending' | 'Inactive';
}

@Injectable({
  providedIn: 'root',
})
export class FarmerAccountService {
  private readonly farmersCollection = collection(db, 'farmers');

  constructor(
    private farmerCache: FarmerCacheService
  ) {}

  async getFarmers(): Promise<FarmerAccount[]> {
  if (this.farmerCache.isLoaded) {
    return this.farmerCache.farmers as FarmerAccount[];
  }

  const snapshot = await getDocs(this.farmersCollection);

  const farmers = snapshot.docs.map((farmerDoc) => ({
    id: farmerDoc.id,
    ...farmerDoc.data(),
  })) as FarmerAccount[];

  this.farmerCache.farmers = farmers;
  this.farmerCache.isLoaded = true;

  return farmers;
}

  async addFarmer(
  farmer: Omit<FarmerAccount, 'id'>,
): Promise<string> {
  const result = await addDoc(this.farmersCollection, farmer);

  this.farmerCache.farmers.push({
    ...farmer,
    id: result.id
  });

  this.farmerCache.isLoaded = true;

  return result.id;
}

  async createFarmerLogin(
    farmer: Omit<FarmerAccount, 'id'>,
    password: string,
  ): Promise<string> {
    const normalizedUsername = farmer.username.trim().toLowerCase();

    // Firebase Authentication uses an internal email for the username.
   const internalEmail =
  `${normalizedUsername}@farmers.ptrisilksystem.com`;

    const credential = await createUserWithEmailAndPassword(
      farmerCreationAuth,
      internalEmail,
      password
    );

    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        fullName: farmer.fullName.trim(),
        username: normalizedUsername,
        email: internalEmail,
        locality: farmer.locality,
        phone: farmer.phone,
        role: 'farmer',
        accountStatus: 'Created',
        createdAt: new Date()
      });

      const farmerRecord = await addDoc(this.farmersCollection, {
  ...farmer,
  username: normalizedUsername,
  email: internalEmail,
  authUid: credential.user.uid
});

const newFarmer: FarmerAccount = {
  ...farmer,
  id: farmerRecord.id,
  username: normalizedUsername,
  email: internalEmail,
  authUid: credential.user.uid
};

if (this.farmerCache.isLoaded) {
  this.farmerCache.farmers.push(newFarmer);
}

      return farmerRecord.id;
    } catch (error) {
      await deleteUser(credential.user);
      throw error;
    }
  }

  async updateFarmer(
  id: string,
  farmer: Partial<Omit<FarmerAccount, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'farmers', id), farmer);

  const index = this.farmerCache.farmers.findIndex(
    (item) => item.id === id
  );

  if (index !== -1) {
    this.farmerCache.farmers[index] = {
      ...this.farmerCache.farmers[index],
      ...farmer
    };
  }
}

  async deleteFarmer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'farmers', id));

  this.farmerCache.farmers =
    this.farmerCache.farmers.filter(
      (farmer) => farmer.id !== id
    );
}
}
