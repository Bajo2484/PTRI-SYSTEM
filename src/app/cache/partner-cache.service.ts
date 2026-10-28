
import { Injectable } from '@angular/core';

export interface PartnerRecord {
  id: string;
  fullName: string;
  organizationName: string;
  locality: string;
  phone: string;
  username: string;
  email: string;
  authUid?: string;
  status: 'Active' | 'Pending' | 'Inactive';
  accountStatus?: 'Created' | 'Pending' | 'Failed';
}

@Injectable({
  providedIn: 'root'
})
export class PartnerCacheService {
  public partners: PartnerRecord[] = [];
  public isLoaded = false;
}
