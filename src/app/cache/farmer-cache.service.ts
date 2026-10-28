import { Injectable } from '@angular/core';

export interface FarmerRecord {
  id: string;
  fullName: string;
  username: string;
  locality: string;
  phone: string;
  farmName: string;
  farmArea: string;
  supplyCommitment: number;
  status: 'Active' | 'Pending' | 'Inactive';
  accountStatus?: 'Created' | 'Pending' | 'Failed';
  email?: string;
  authUid?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FarmerCacheService {
  public farmers: FarmerRecord[] = [];
  public isLoaded = false;
}