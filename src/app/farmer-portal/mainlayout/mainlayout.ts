
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Menu,
  X,
  House,
  Sprout,
  Package,
  Truck,
  MessageCircle,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
   Settings as SettingsIcon,
} from 'lucide-angular';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { MessageService, ChatMessage } from '../../services/message.service';

interface FarmerNotification extends ChatMessage {
  read?: boolean;
}

@Component({
  selector: 'app-farmer-mainlayout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
    DatePipe,
  ],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout implements OnInit, OnDestroy {
  menuOpen = false;
  sidebarExpanded = false;

  notifications: FarmerNotification[] = [];
  unreadNotificationCount = 0;
  isNotificationOpen = false;

  private authUnsubscribe: (() => void) | null = null;
  private messageUnsubscribe: (() => void) | null = null;
  private routerSubscription!: Subscription;

  readonly icons = {
    Menu,
    X,
    House,
    Sprout,
    Package,
    Truck,
    MessageCircle,
    UserRound,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    Settings: SettingsIcon,
  };

  constructor(
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen = false;
      });
  }

  ngOnInit() {
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      this.messageUnsubscribe?.();
      this.messageUnsubscribe = null;

      if (!user) {
        this.notifications = [];
        this.unreadNotificationCount = 0;
        this.cdr.detectChanges();
        return;
      }

      this.messageUnsubscribe =
        this.messageService.listenToIncomingFarmerMessages(
          user.uid,
          (messages) => {
            const staffMessages = messages
              .filter((message) => message.senderRole === 'staff')
              .sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() ?? 0;
                const dateB = b.createdAt?.toMillis?.() ?? 0;
                return dateB - dateA;
              });

            this.unreadNotificationCount = staffMessages.filter(
              (message) => (message as FarmerNotification).read === false
            ).length;

            this.notifications = staffMessages.slice(0, 10) as FarmerNotification[];

            this.cdr.detectChanges();
          },
          (error) => {
            console.error('Failed to load farmer notifications:', error);
          }
        );
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleSidebar() {
    this.sidebarExpanded = !this.sidebarExpanded;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  toggleNotifications() {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  openMessages() {
    this.isNotificationOpen = false;
    this.router.navigateByUrl('/farmer/messages');
  }

  async logout() {
    try {
      await signOut(auth);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  ngOnDestroy() {
    this.authUnsubscribe?.();
    this.messageUnsubscribe?.();
    this.routerSubscription?.unsubscribe();
  }
}
