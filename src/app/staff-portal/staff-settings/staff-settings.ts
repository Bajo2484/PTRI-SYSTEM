
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import Swal from 'sweetalert2';

import { auth } from '../../services/firebase';

@Component({
  selector: 'app-staff-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-settings.html',
  styleUrl: './staff-settings.css',
})
export class StaffSettings {

  // SETTINGS TABS
  activeTab: 'security' | 'system' = 'security';

  selectTab(tab: 'security' | 'system'): void {
    this.activeTab = tab;
  }

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  isSaving = false;

  constructor(private cdr: ChangeDetectorRef) {}

  async changePassword(): Promise<void> {
    const user = auth.currentUser;

    if (!user || !user.email) {
      await Swal.fire({
        icon: 'error',
        title: 'Account Not Found',
        text: 'Please sign in again before changing your password.'
      });
      return;
    }

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      await Swal.fire({
        icon: 'warning',
        title: 'Incomplete Information',
        text: 'Please complete all password fields.'
      });
      return;
    }

    if (this.newPassword.length < 8) {
      await Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Your new password must contain at least 8 characters.'
      });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      await Swal.fire({
        icon: 'warning',
        title: 'Password Does Not Match',
        text: 'Please make sure your new password and confirmation match.'
      });
      return;
    }

    if (this.currentPassword === this.newPassword) {
      await Swal.fire({
        icon: 'info',
        title: 'Same Password',
        text: 'Please choose a password different from your current password.'
      });
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Updating Password',
      text: 'Please wait while we secure your account.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        this.currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, this.newPassword);

      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';

      await Swal.fire({
        icon: 'success',
        title: 'Password Updated!',
        text: 'Your account password has been changed successfully.',
        confirmButtonColor: '#245638'
      });

    } catch (error: any) {
      console.error('Password update failed:', error);

      let message = 'Unable to update your password. Please try again.';

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password'
      ) {
        message = 'Your current password is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Your new password is too weak.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please sign out and sign in again before changing your password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      }

      await Swal.fire({
        icon: 'error',
        title: 'Password Update Failed',
        text: message
      });

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
