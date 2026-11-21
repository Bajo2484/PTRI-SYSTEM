
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { SilkOrderService, type SilkOrder } from '../../services/silk-order.service';
import { MessageService, type ChatMessage } from '../../services/message.service';
import type { Unsubscribe } from 'firebase/firestore';

interface DashboardUpdate {
  orderId: string;
  status: string;
  updatedAt: Date;
}

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './partner-dashboard.html',
  styleUrl: './partner-dashboard.css',
})
export class PartnerDashboard implements OnInit, OnDestroy {
  constructor(
    private silkOrderService: SilkOrderService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  currentPartnerUid = '';
  currentPartnerName = '';
  currentPartnerLocation = '';

  today = new Date();
  greeting = 'Good day';

  orders: SilkOrder[] = [];
  incomingMessages: ChatMessage[] = [];

  latestMessage: ChatMessage | null = null;
  recentUpdates: DashboardUpdate[] = [];

  isLoading = true;
  hasPartnerProfile = false;

  private unsubscribeOrders?: Unsubscribe;
  private unsubscribeMessages?: Unsubscribe;

  get totalOrders(): number {
    return this.orders.length;
  }

  get activeOrders(): number {
    return this.orders.filter(order =>
      order.status !== 'Delivered' && order.status !== 'Rejected'
    ).length;
  }

  get pendingOrders(): number {
    return this.orders.filter(
      order => order.status === 'Pending Review'
    ).length;
  }

  get completedOrders(): number {
    return this.orders.filter(
      order => order.status === 'Delivered'
    ).length;
  }

  get unreadMessages(): number {
    return this.incomingMessages.filter(
      message => message.read === false
    ).length;
  }

  get unreadConversationCount(): number {
    const unreadConversationIds = new Set(
      this.incomingMessages
        .filter(message => message.read === false)
        .map(message => message.conversationId)
    );

    return unreadConversationIds.size;
  }

  get deliveryOrders(): SilkOrder[] {
    return this.orders.filter(order =>
      ['Ready for Dispatch', 'Dispatched', 'In Transit'].includes(order.status)
    );
  }

  get latestDeliveryOrder(): SilkOrder | null {
    return this.deliveryOrders.length ? this.deliveryOrders[0] : null;
  }

  get latestMessageSender(): string {
    if (!this.latestMessage) return 'PTRI Staff';

    return this.latestMessage.senderRole === 'staff'
      ? 'PTRI Staff'
      : 'Message';
  }

  async ngOnInit(): Promise<void> {
    this.setGreeting();
    await this.loadPartnerInfo();
  }

  ngOnDestroy(): void {
    this.unsubscribeOrders?.();
    this.unsubscribeMessages?.();
  }

  private setGreeting(): void {
    const hour = new Date().getHours();

    if (hour < 12) {
      this.greeting = 'Good morning';
    } else if (hour < 18) {
      this.greeting = 'Good afternoon';
    } else {
      this.greeting = 'Good evening';
    }
  }

  async loadPartnerInfo(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      this.isLoading = false;
      this.cdr.detectChanges();

      await Swal.fire({
        icon: 'warning',
        title: 'Partner Account Not Found',
        text: 'Please log in again to view your dashboard.',
        confirmButtonColor: '#244b38'
      });

      return;
    }

    this.currentPartnerUid = user.uid;

    Swal.fire({
      title: 'Loading Dashboard',
      text: 'Please wait while we retrieve your dashboard information.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#244b38',
      didOpen: () => Swal.showLoading()
    });

    try {
      const partnerQuery = query(
        collection(db, 'partners'),
        where('authUid', '==', user.uid)
      );

      const snapshot = await getDocs(partnerQuery);

      if (snapshot.empty) {
        this.hasPartnerProfile = false;

        await Swal.fire({
          icon: 'error',
          title: 'Partner Profile Not Found',
          text: 'We could not find the partner profile connected to your account.',
          confirmButtonColor: '#244b38'
        });

        return;
      }

      const partnerData = snapshot.docs[0].data();

      this.currentPartnerName =
        partnerData['organizationName'] ||
        partnerData['fullName'] ||
        'Business Partner';

      this.currentPartnerLocation =
        partnerData['locality'] ||
        partnerData['address'] ||
        '';

      this.hasPartnerProfile = true;

      this.listenToOrders();
      this.listenToMessages();

    } catch (error) {
      console.error('Unable to load partner dashboard:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Dashboard',
        text: 'Something went wrong while retrieving your dashboard information. Please try again.',
        confirmButtonColor: '#244b38'
      });

    } finally {
      this.isLoading = false;
      Swal.close();
      this.cdr.detectChanges();
    }
  }

  private listenToOrders(): void {
    if (!this.currentPartnerUid) return;

    this.unsubscribeOrders = this.silkOrderService.listenToPartnerOrders(
      this.currentPartnerUid,
      orders => {
        this.orders = orders;
        this.buildRecentUpdates();
        this.cdr.detectChanges();
      },
      error => {
        console.error('Unable to listen to partner orders:', error);
        this.cdr.detectChanges();
      }
    );
  }

  private listenToMessages(): void {
    if (!this.currentPartnerUid) return;

    this.unsubscribeMessages = this.messageService.listenToIncomingPartnerMessages(
      this.currentPartnerUid,
      messages => {
        this.incomingMessages = messages;

        this.latestMessage = [...messages].sort(
          (a, b) => this.getTime(b.createdAt) - this.getTime(a.createdAt)
        )[0] ?? null;

        this.cdr.detectChanges();
      },
      error => {
        console.error('Unable to listen to partner messages:', error);
        this.cdr.detectChanges();
      }
    );
  }

  private buildRecentUpdates(): void {
    const updates: DashboardUpdate[] = [];

    this.orders.forEach(order => {
      (order.statusHistory || []).forEach(history => {
        const updatedAt = this.toDate(history.updatedAt);

        if (updatedAt) {
          updates.push({
            orderId: order.orderId,
            status: history.status,
            updatedAt
          });
        }
      });
    });

    this.recentUpdates = updates
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 4);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending Review':
        return 'awaiting';
      case 'Order Confirmed':
      case 'Preparing Order':
      case 'Packing Completed':
        return 'preparing';
      case 'Ready for Dispatch':
      case 'Dispatched':
      case 'In Transit':
        return 'scheduled';
      case 'Delivered':
        return 'delivered';
      case 'Rejected':
        return 'rejected';
      default:
        return 'default';
    }
  }

  getTime(value: any): number {
    if (!value) return 0;

    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    const date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private toDate(value: any): Date | null {
    if (!value) return null;

    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
}
