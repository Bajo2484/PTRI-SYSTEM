
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { FarmerAccountService } from '../../services/farmer-account.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-farmer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-profile.html',
  styleUrl: './farmer-profile.css',
})
export class FarmerProfile implements OnInit {

  profile: any = null;
  farmerId = '';

  isLoading = true;
  isEditingBio = false;
  isSavingBio = false;
  errorMessage = '';

  bioForm = {
    bio: '',
    farmingExperience: '',
    farmingPractices: ''
  };

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

  constructor(
    private cdr: ChangeDetectorRef,
    private farmerAccountService: FarmerAccountService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Loading Profile',
      text: 'Please wait while we retrieve your account information.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

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

      this.farmerId = farmerSnapshot.empty
        ? ''
        : farmerSnapshot.docs[0].id;

      this.profile = {
        fullName: userData['fullName'] || farmerData['fullName'] || 'Not provided',
        email: userData['email'] || currentUser.email || 'Not provided',
        phone: userData['phone'] || farmerData['phone'] || 'Not provided',
        locality: userData['locality'] || farmerData['locality'] || 'Not provided',
        farmName: farmerData['farmName'] || 'Not provided',
        farmArea: farmerData['farmArea'] || 'Not provided',
        supplyCommitment: farmerData['supplyCommitment'] ?? 'Not provided',
        status: farmerData['status'] || userData['accountStatus'] || 'Registered',
        createdAt: farmerData['createdAt'] || userData['createdAt'] || null,

        profilePicture: farmerData['profilePicture'] || '',
        farmerType: farmerData['farmerType'] || 'Individual',
        communityName: farmerData['communityName'] || '',
        memberCount: farmerData['memberCount'] ?? null,

        bio: farmerData['bio'] || '',
        farmingExperience: farmerData['farmingExperience'] || '',
        farmingPractices: farmerData['farmingPractices'] || ''
      };

      this.bioForm = {
        bio: this.profile.bio,
        farmingExperience: this.profile.farmingExperience,
        farmingPractices: this.profile.farmingPractices
      };

    } catch (error) {
      console.error('Error loading farmer profile:', error);
      this.errorMessage = 'Unable to load your profile information.';

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();

      Swal.close();

      if (this.errorMessage) {
        await Swal.fire({
          icon: 'error',
          title: 'Profile Loading Failed',
          text: this.errorMessage,
          confirmButtonColor: '#245638'
        });
      }
    }
  }

  openBioEditor(): void {
    this.bioForm = {
      bio: this.profile?.bio || '',
      farmingExperience: this.profile?.farmingExperience || '',
      farmingPractices: this.profile?.farmingPractices || ''
    };

    this.isEditingBio = true;
  }

  cancelBioEdit(): void {
    this.bioForm = {
      bio: this.profile?.bio || '',
      farmingExperience: this.profile?.farmingExperience || '',
      farmingPractices: this.profile?.farmingPractices || ''
    };

    this.isEditingBio = false;
  }

  async saveBio(): Promise<void> {
    if (!this.farmerId) {
      await Swal.fire({
        icon: 'error',
        title: 'Farmer Record Not Found',
        text: 'Your farmer record could not be identified. Please contact PTRI staff.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    if (!this.bioForm.bio.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Biography Required',
        text: 'Please provide a short introduction about yourself or your farming community.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    this.isSavingBio = true;

    Swal.fire({
      title: 'Saving Biography',
      text: 'Please wait while your information is updated.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const updatedBio = {
        bio: this.bioForm.bio.trim(),
        farmingExperience: this.bioForm.farmingExperience.trim(),
        farmingPractices: this.bioForm.farmingPractices.trim()
      };

      await this.farmerAccountService.updateFarmer(
        this.farmerId,
        updatedBio
      );

      this.profile = {
        ...this.profile,
        ...updatedBio
      };

      this.isEditingBio = false;

      await Swal.fire({
        icon: 'success',
        title: 'Biography Updated!',
        text: 'Your farmer biography has been saved successfully.',
        confirmButtonColor: '#245638'
      });

    } catch (error) {
      console.error('Error saving farmer biography:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Save',
        text: 'Something went wrong while saving your biography. Please try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isSavingBio = false;
      this.cdr.detectChanges();
    }
  }
}
