
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, updateProfile, Unsubscribe } from 'firebase/auth';
import Swal from 'sweetalert2';
import { auth, db } from '../../services/firebase';

interface StaffProfileData {
  fullName: string;
  email: string;
  role: string;
  contactNumber: string;
}

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-profile.html',
  styleUrl: './staff-profile.css',
})
export class StaffProfile implements OnInit, OnDestroy {

  profile: StaffProfileData = {
    fullName: '',
    email: '',
    role: 'PTRI Staff',
    contactNumber: ''
  };

  originalProfile: StaffProfileData = { ...this.profile };

  isLoading = true;
  isSaving = false;
  isEditing = false;

  private authUnsubscribe?: Unsubscribe;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.exists() ? userDoc.data() : {};

        this.profile = {
          fullName: data['fullName'] || user.displayName || '',
          email: data['email'] || user.email || '',
          role: data['role'] || 'PTRI Staff',
          contactNumber: data['contactNumber'] || ''
        };

        this.originalProfile = { ...this.profile };

      } catch (error) {
        console.error('Failed to load staff profile:', error);

        Swal.fire({
          icon: 'error',
          title: 'Unable to Load Profile',
          text: 'Please try refreshing the page.'
        });

      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
  }

  async saveProfile(): Promise<void> {
    const user = auth.currentUser;

    if (!user) return;

    if (!this.profile.fullName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Full Name Required',
        text: 'Please enter your full name.'
      });
      return;
    }

    this.isSaving = true;

    Swal.fire({
      title: 'Saving Profile',
      text: 'Please wait while we update your information.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const updatedName = this.profile.fullName.trim();

      await updateProfile(user, {
        displayName: updatedName
      });

      await setDoc(doc(db, 'users', user.uid), {
        fullName: updatedName,
        contactNumber: this.profile.contactNumber.trim()
      }, { merge: true });

      this.profile.fullName = updatedName;
      this.originalProfile = { ...this.profile };
      this.isEditing = false;

      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your profile information has been saved successfully.',
        confirmButtonColor: '#245638'
      });

    } catch (error) {
      console.error('Failed to update staff profile:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Unable to save your profile. Please try again.'
      });

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  cancelEdit(): void {
    this.profile = { ...this.originalProfile };
    this.isEditing = false;
  }

}
