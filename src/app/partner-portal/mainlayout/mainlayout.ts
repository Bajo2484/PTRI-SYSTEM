
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import {
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import Swal from 'sweetalert2';

import { auth } from '../../services/firebase';
import { MessageService, ChatMessage } from '../../services/message.service';

type PartnerNotification = ChatMessage & { read?: boolean };

@Component({
  selector: 'app-partner-mainlayout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout implements OnInit, OnDestroy {
  isSidebarExpanded = false;
  isMobileMenuOpen = false;

  // NOTIFICATIONS
  isNotificationOpen = false;
  notifications: PartnerNotification[] = [];

  // SETTINGS DROPDOWN
  isSettingsOpen = false;
  isNotificationPreferencesOpen = false;
  isSecuritySettingsOpen = false;
  isPrivacySettingsOpen = false;

  // NOTIFICATION PREFERENCES
  showMessageNotifications = true;
  showUnreadBadge = true;

  private currentUserUid: string | null = null;
  private readonly preferencesStorageKey = 'partnerNotificationPreferences';

  // SECURITY SETTINGS
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  isChangingPassword = false;

  private authUnsubscribe?: () => void;
  private messagesUnsubscribe?: () => void;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      this.messagesUnsubscribe?.();
      this.notifications = [];
      this.currentUserUid = user?.uid ?? null;

      if (!user) {
        this.resetNotificationPreferences();
        this.cdr.detectChanges();
        return;
      }

      this.loadNotificationPreferences(user.uid);

      this.messagesUnsubscribe =
        this.messageService.listenToIncomingPartnerMessages(
          user.uid,
          (messages) => {
            this.notifications = messages
              .filter(message => message.senderRole === 'staff')
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() ?? 0;
                const timeB = b.createdAt?.toMillis?.() ?? 0;
                return timeB - timeA;
              })
              .slice(0, 10);

            this.cdr.detectChanges();
          },
          (error) => {
            console.error('Partner notifications error:', error);
          }
        );
    });
  }

  // DISPLAYED NOTIFICATIONS
  get displayedNotifications(): PartnerNotification[] {
    return this.showMessageNotifications ? this.notifications : [];
  }

  // UNREAD NOTIFICATION COUNT
  get unreadNotificationCount(): number {
    if (!this.showUnreadBadge) return 0;

    return this.notifications.filter(
      message => message.read === false
    ).length;
  }

  // LOAD NOTIFICATION PREFERENCES
  private loadNotificationPreferences(uid: string): void {
    try {
      const savedPreferences = localStorage.getItem(
        `${this.preferencesStorageKey}_${uid}`
      );

      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);

        this.showMessageNotifications =
          preferences.showMessageNotifications !== false;

        this.showUnreadBadge =
          preferences.showUnreadBadge !== false;
      } else {
        this.resetNotificationPreferences();
      }
    } catch (error) {
      console.error('Unable to load notification preferences:', error);
      this.resetNotificationPreferences();
    }
  }

  // SAVE NOTIFICATION PREFERENCES
  private saveNotificationPreferences(): void {
    if (!this.currentUserUid) return;

    try {
      const preferences = {
        showMessageNotifications: this.showMessageNotifications,
        showUnreadBadge: this.showUnreadBadge
      };

      localStorage.setItem(
        `${this.preferencesStorageKey}_${this.currentUserUid}`,
        JSON.stringify(preferences)
      );

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Unable to save notification preferences:', error);
    }
  }

  // RESET PREFERENCES
  private resetNotificationPreferences(): void {
    this.showMessageNotifications = true;
    this.showUnreadBadge = true;
  }

  // TOGGLE MESSAGE NOTIFICATIONS
  toggleMessageNotifications(): void {
    this.showMessageNotifications = !this.showMessageNotifications;
    this.saveNotificationPreferences();
  }

  // TOGGLE UNREAD BADGE
  toggleUnreadBadge(): void {
    this.showUnreadBadge = !this.showUnreadBadge;
    this.saveNotificationPreferences();
  }

  // OPEN NOTIFICATION PREFERENCES
  openNotificationPreferences(): void {
    this.isNotificationPreferencesOpen = true;
    this.isSecuritySettingsOpen = false;
    this.isPrivacySettingsOpen = false;
    this.isSettingsOpen = true;
    this.isNotificationOpen = false;
  }

  // OPEN SECURITY SETTINGS
  openSecuritySettings(): void {
    this.isSecuritySettingsOpen = true;
    this.isNotificationPreferencesOpen = false;
    this.isPrivacySettingsOpen = false;
    this.isSettingsOpen = true;
    this.isNotificationOpen = false;
  }

  // OPEN PRIVACY SETTINGS
  openPrivacySettings(): void {
    this.isPrivacySettingsOpen = true;
    this.isNotificationPreferencesOpen = false;
    this.isSecuritySettingsOpen = false;
    this.isSettingsOpen = true;
    this.isNotificationOpen = false;
  }

  // BACK TO SETTINGS
  backToSettings(): void {
    this.isNotificationPreferencesOpen = false;
    this.isSecuritySettingsOpen = false;
    this.isPrivacySettingsOpen = false;
  }

  // PASSWORD REQUIREMENTS
  get passwordHasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get passwordHasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get passwordHasNumber(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get passwordHasSpecialCharacter(): boolean {
    return /[^A-Za-z0-9]/.test(this.newPassword);
  }

  get isNewPasswordValid(): boolean {
    return (
      this.passwordHasMinLength &&
      this.passwordHasUppercase &&
      this.passwordHasLowercase &&
      this.passwordHasNumber &&
      this.passwordHasSpecialCharacter
    );
  }

  // CLEAR PASSWORD FIELDS
  private clearPasswordFields(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';

    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  // CHANGE PASSWORD
  async changePassword(): Promise<void> {
    const user = auth.currentUser;

    if (!user || !user.email) {
      await Swal.fire({
        icon: 'error',
        title: 'Account Not Available',
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

    if (!this.isNewPasswordValid) {
      await Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Your new password does not meet all the password requirements.'
      });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      await Swal.fire({
        icon: 'warning',
        title: 'Passwords Do Not Match',
        text: 'Please make sure your new password and confirmation match.'
      });
      return;
    }

    if (this.currentPassword === this.newPassword) {
      await Swal.fire({
        icon: 'warning',
        title: 'Choose a Different Password',
        text: 'Your new password must be different from your current password.'
      });
      return;
    }

    this.isChangingPassword = true;

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

      Swal.close();
      this.clearPasswordFields();
      this.isChangingPassword = false;
      this.cdr.detectChanges();

      await Swal.fire({
        icon: 'success',
        title: 'Password Updated',
        text: 'Your account password has been changed successfully.',
        confirmButtonColor: '#245638'
      });

      this.backToSettings();

    } catch (error: any) {
      Swal.close();

      console.error('Password update failed:', error);

      let errorMessage = 'Unable to update your password. Please try again.';

      if (error?.code === 'auth/wrong-password' ||
          error?.code === 'auth/invalid-credential') {
        errorMessage = 'Your current password is incorrect.';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Your new password is too weak. Please choose a stronger password.';
      } else if (error?.code === 'auth/requires-recent-login') {
        errorMessage = 'For your security, please sign out and sign in again before changing your password.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a while before trying again.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      await Swal.fire({
        icon: 'error',
        title: 'Password Update Failed',
        text: errorMessage,
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isChangingPassword = false;
      this.cdr.detectChanges();
    }
  }

  // TOGGLE NOTIFICATIONS
  toggleNotifications(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
    this.isSettingsOpen = false;
    this.isNotificationPreferencesOpen = false;
    this.isSecuritySettingsOpen = false;
    this.isPrivacySettingsOpen = false;
  }

  // TOGGLE SETTINGS
  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    this.isNotificationOpen = false;
    this.isNotificationPreferencesOpen = false;
    this.isSecuritySettingsOpen = false;
    this.isPrivacySettingsOpen = false;
  }

  // OPEN MESSAGES
  openMessages(): void {
    this.isNotificationOpen = false;
    this.router.navigateByUrl('/partner/messages');
  }

  // SIDEBAR
  toggleSidebar(): void {
    this.isSidebarExpanded = !this.isSidebarExpanded;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  // LOGOUT
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.closeMobileMenu();
      this.isSettingsOpen = false;
      this.isNotificationOpen = false;
      this.isNotificationPreferencesOpen = false;
      this.isSecuritySettingsOpen = false;
      this.isPrivacySettingsOpen = false;
      this.clearPasswordFields();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.messagesUnsubscribe?.();
  }
}
