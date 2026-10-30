
import { Injectable } from '@angular/core';
import { FarmerAccount } from '../services/farmer-account.service';
import { PartnerAccount } from '../services/partner-account.service';

@Injectable({ providedIn: 'root' })
export class MessageCacheService {
  farmers: FarmerAccount[] = [];
  partners: PartnerAccount[] = [];
  conversations: any[] = [];

  accountsLoaded = false;
  conversationsLoaded = false;

  clearCache(): void {
    this.farmers = [];
    this.partners = [];
    this.conversations = [];
    this.accountsLoaded = false;
    this.conversationsLoaded = false;
  }
}
