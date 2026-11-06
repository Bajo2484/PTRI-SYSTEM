
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Swal from 'sweetalert2';

interface PartnerProfile {
  fullName: string;
  organizationName: string;
  locality: string;
  address: string;
  phone: string;
  email: string;
  username: string;
  status: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}

  partnerDocId = '';
  isLoading = false;
  isSaving = false;
  showEditModal = false;

  profile: PartnerProfile = {
    fullName: '',
    organizationName: '',
    locality: '',
    address: '',
    phone: '',
    email: '',
    username: '',
    status: 'Pending'
  };

  editForm = {
    fullName: '',
    organizationName: '',
    locality: '',
    address: '',
    phone: ''
  };

  get avatarLetter(): string {
    return this.profile.organizationName?.charAt(0).toUpperCase() ||
      this.profile.fullName?.charAt(0).toUpperCase() || 'P';
  }

  async ngOnInit(): Promise<void> {
    await this.loadPartnerProfile();
  }

  async loadPartnerProfile(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      await Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please log in again to view your partner profile.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Loading Your Profile',
      text: 'Please wait while we retrieve your account information.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      const partnerQuery = query(
        collection(db, 'partners'),
        where('authUid', '==', user.uid)
      );

      const snapshot = await getDocs(partnerQuery);

      if (snapshot.empty) {
        throw new Error('Partner profile not found.');
      }

      const partnerDoc = snapshot.docs[0];
      const data = partnerDoc.data();

      this.partnerDocId = partnerDoc.id;

      this.profile = {
        fullName: data['fullName'] || '',
        organizationName: data['organizationName'] || '',
        locality: data['locality'] || '',
        address: data['address'] || '',
        phone: data['phone'] || '',
        email: data['email'] || user.email || '',
        username: data['username'] || '',
        status: data['status'] || 'Pending'
      };

      this.cdr.detectChanges();

      Swal.close();

    } catch (error) {
      console.error('Unable to load partner profile:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Profile Loading Failed',
        text: 'Unable to retrieve your partner information. Please try again.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openEditModal(): void {
    this.editForm = {
      fullName: this.profile.fullName,
      organizationName: this.profile.organizationName,
      locality: this.profile.locality,
      address: this.profile.address,
      phone: this.profile.phone
    };

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  async saveProfile(): Promise<void> {
    if (
      !this.editForm.fullName.trim() ||
      !this.editForm.organizationName.trim() ||
      !this.editForm.phone.trim()
    ) {
      await Swal.fire({
        icon: 'warning',
        title: 'Required Information',
        text: 'Please complete your full name, organization name, and contact number.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    if (!this.partnerDocId) {
      await Swal.fire({
        icon: 'error',
        title: 'Profile Not Found',
        text: 'Your partner record could not be identified.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Updating Profile',
      text: 'Please wait while we save your changes.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      const updatedData = {
        fullName: this.editForm.fullName.trim(),
        organizationName: this.editForm.organizationName.trim(),
        locality: this.editForm.locality.trim(),
        address: this.editForm.address.trim(),
        phone: this.editForm.phone.trim()
      };

      await updateDoc(
        doc(db, 'partners', this.partnerDocId),
        updatedData
      );

      this.profile = {
        ...this.profile,
        ...updatedData
      };

      this.cdr.detectChanges();
      this.showEditModal = false;

      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your partner profile information has been saved successfully.',
        confirmButtonText: 'Great!',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

    } catch (error) {
      console.error('Unable to update partner profile:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Unable to save your profile changes. Please try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }
}
