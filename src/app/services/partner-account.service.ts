import { PartnerCacheService } from '../cache/partner-cache.service';
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
  partnerCreationAuth,
  db
} from './firebase';

export interface PartnerAccount {
  id: string;
  fullName: string;
  organizationName: string;
  locality: string;
  address: string;
  phone: string;
  email: string;
  username: string;
  authUid?: string;
  status: 'Active' | 'Pending' | 'Inactive';
}

@Injectable({
  providedIn: 'root'
})
export class PartnerAccountService {
  private readonly partnersCollection = collection(db, 'partners');
    constructor(
  private partnerCache: PartnerCacheService
) {}

 async getPartners(): Promise<PartnerAccount[]> {
  if (this.partnerCache.isLoaded) {
    return this.partnerCache.partners as PartnerAccount[];
  }

  const snapshot = await getDocs(this.partnersCollection);

  const partners = snapshot.docs.map((partnerDoc) => ({
    id: partnerDoc.id,
    ...partnerDoc.data()
  })) as PartnerAccount[];

  this.partnerCache.partners = partners;
  this.partnerCache.isLoaded = true;

  return partners;
}

 
async createPartnerLogin(
  partner: Omit<PartnerAccount, 'id'>,
  password: string
): Promise<string> {
  const normalizedUsername = partner.username.trim().toLowerCase();

  const internalEmail =
    `${normalizedUsername}@partners.ptrisilksystem.com`;

  const contactEmail = partner.email.trim();

  const credential = await createUserWithEmailAndPassword(
    partnerCreationAuth,
    internalEmail,
    password
  );

  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      fullName: partner.fullName.trim(),
      username: normalizedUsername,
      email: internalEmail,
      contactEmail,
      organizationName: partner.organizationName.trim(),
      locality: partner.locality.trim(),
      address: partner.address.trim(),
      phone: partner.phone.trim(),
      role: 'partner',
      accountStatus: 'Created',
      createdAt: new Date()
    });

    const partnerRecord = await addDoc(this.partnersCollection, {
      ...partner,
      fullName: partner.fullName.trim(),
      username: normalizedUsername,
      email: contactEmail,
      contactEmail,
      authUid: credential.user.uid
    });

    const newPartner: PartnerAccount = {
      ...partner,
      id: partnerRecord.id,
      fullName: partner.fullName.trim(),
      username: normalizedUsername,
      email: contactEmail,
      authUid: credential.user.uid
    };

    if (this.partnerCache.isLoaded) {
      this.partnerCache.partners.push(newPartner);
    }

    return partnerRecord.id;
  } catch (error) {
    await deleteUser(credential.user);
    throw error;
  }
}


  
async updatePartner(
  id: string,
  partner: Partial<Omit<PartnerAccount, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'partners', id), partner);

  const index = this.partnerCache.partners.findIndex(
    (item) => item.id === id
  );

  if (index !== -1) {
    this.partnerCache.partners[index] = {
      ...this.partnerCache.partners[index],
      ...partner
    };
  }
}


  
async deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partners', id));

  this.partnerCache.partners =
    this.partnerCache.partners.filter(
      (partner) => partner.id !== id
    );
}

}
