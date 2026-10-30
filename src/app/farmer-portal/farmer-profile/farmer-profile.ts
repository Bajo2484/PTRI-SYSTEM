
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  UserRound,
  UserRoundPen,
  Sprout,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  ShieldCheck,
  Pencil,
  Save,
  X,
  Building2,
  BadgeCheck,
  CircleUserRound
} from 'lucide-angular';

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

@Component({
  selector: 'app-farmer-profile',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './farmer-profile.html',
  styleUrl: './farmer-profile.css',
})
export class FarmerProfile implements OnInit {

  profile: any = null;
  isLoading = true;
  errorMessage = '';

  readonly UserRound = UserRound;
  readonly UserRoundPen = UserRoundPen;
  readonly Sprout = Sprout;
  readonly MapPin = MapPin;
  readonly Phone = Phone;
  readonly Mail = Mail;
  readonly CalendarDays = CalendarDays;
  readonly ShieldCheck = ShieldCheck;
  readonly Pencil = Pencil;
  readonly Save = Save;
  readonly X = X;
  readonly Building2 = Building2;
  readonly BadgeCheck = BadgeCheck;
  readonly CircleUserRound = CircleUserRound;

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        this.errorMessage = 'No authenticated farmer account found.';
        return;
      }

      const userSnapshot = await getDoc(
        doc(db, 'users', currentUser.uid)
      );

      if (!userSnapshot.exists()) {
        this.errorMessage = 'Farmer account information was not found.';
        return;
      }

      const userData = userSnapshot.data();

      const farmerQuery = query(
        collection(db, 'farmers'),
        where('authUid', '==', currentUser.uid)
      );

      const farmerSnapshot = await getDocs(farmerQuery);

      const farmerData = farmerSnapshot.empty
        ? {}
        : farmerSnapshot.docs[0].data();

      this.profile = {
        fullName: userData['fullName'] || farmerData['fullName'] || 'Not provided',
        email: userData['email'] || currentUser.email || 'Not provided',
        phone: userData['phone'] || farmerData['phone'] || 'Not provided',
        locality: userData['locality'] || farmerData['locality'] || 'Not provided',
        farmName: farmerData['farmName'] || 'Not provided',
        farmArea: farmerData['farmArea'] || 'Not provided',
        supplyCommitment: farmerData['supplyCommitment'] ?? 'Not provided',
        status: farmerData['status'] || userData['accountStatus'] || 'Registered',
        createdAt: farmerData['createdAt'] || userData['createdAt'] || null
      };

    } catch (error) {
      console.error('Error loading farmer profile:', error);
      this.errorMessage = 'Unable to load your profile information.';
    } finally {
      this.isLoading = false;
    }
  }
}
