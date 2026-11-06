
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Unsubscribe, doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { MessageService, ChatMessage } from '../../services/message.service';

type StaffNotification = ChatMessage & { read?: boolean };

interface StaffProfile {
  fullName: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-mainlayout',
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
  notifications: StaffNotification[] = [];

  // STAFF PROFILE
  staffProfile: StaffProfile = {
    fullName: 'Staff Account',
    email: '',
    role: 'PTRI Staff'
  };

  private authUnsubscribe?: Unsubscribe;
  private messagesUnsubscribe?: Unsubscribe;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      this.messagesUnsubscribe?.();
      this.notifications = [];

      if (!user) {
        this.staffProfile = {
          fullName: 'Staff Account',
          email: '',
          role: 'PTRI Staff'
        };
        this.cdr.detectChanges();
        return;
      }

      void this.loadStaffProfile(user.uid, user.displayName, user.email);

      this.messagesUnsubscribe =
        this.messageService.listenToIncomingStaffMessages(
          user.uid,
          (messages) => {
            this.notifications = messages
              .filter(message => message.senderRole !== 'staff')
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() ?? 0;
                const timeB = b.createdAt?.toMillis?.() ?? 0;
                return timeB - timeA;
              })
              .slice(0, 10);

            this.cdr.detectChanges();
          },
          (error) => {
            console.error('Staff notifications error:', error);
          }
        );
    });
  }

  // LOAD STAFF PROFILE
  async loadStaffProfile(
    uid: string,
    authName: string | null,
    authEmail: string | null
  ): Promise<void> {
    try {
      const profileSnapshot = await getDoc(doc(db, 'users', uid));

      if (profileSnapshot.exists()) {
        const data = profileSnapshot.data();

        this.staffProfile = {
          fullName: data['fullName'] || authName || 'Staff Account',
          email: data['email'] || authEmail || '',
          role: data['role'] || 'PTRI Staff'
        };
      } else {
        this.staffProfile = {
          fullName: authName || 'Staff Account',
          email: authEmail || '',
          role: 'PTRI Staff'
        };
      }
    } catch (error) {
      console.error('Failed to load staff profile:', error);
    }

    this.cdr.detectChanges();
  }

  get unreadNotificationCount(): number {
    return this.notifications.filter(message => message.read === false).length;
  }

  // NOTIFICATION CONTROLS
  toggleNotifications(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  closeDropdowns(): void {
    this.isNotificationOpen = false;
  }

  // SIDEBAR
  toggleSidebar(): void {
    if (window.innerWidth <= 1000) {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    } else {
      this.isSidebarExpanded = !this.isSidebarExpanded;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  // LOGOUT
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.closeMobileMenu();
      this.closeDropdowns();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  openMessages(): void {
    this.closeDropdowns();
    this.router.navigateByUrl('/staff/messages');
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.messagesUnsubscribe?.();
  }
}
