
import { getAuth } from 'firebase/auth';
import { MessageCacheService } from '../../cache/message-cache.service';
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import {
  FarmerAccount,
  FarmerAccountService
} from '../../services/farmer-account.service';

import {
  PartnerAccount,
  PartnerAccountService
} from '../../services/partner-account.service';
import { Unsubscribe } from 'firebase/firestore';

// ADDED: Silk Order Service
import {
  SilkOrder,
  SilkOrderService
} from '../../services/silk-order.service';

interface Message {
  id: string;
  sender: 'staff' | 'other';
  text: string;
  time: string;

  // ADDED: Delivery proposal information
  messageType?: 'text' | 'delivery-date-proposal';
  orderDocId?: string;
  orderId?: string;
  proposedDeliveryDate?: string;
  proposalStatus?: 'pending' | 'accepted' | 'declined';
}

interface Conversation {
  id: number;
  name: string;
  organization: string;
  role: 'Farmer' | 'Partner';
  location: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: Message[];
  recipientUid?: string;
  recipientRole?: 'farmer' | 'partner';
  firebaseConversationId?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class Messages implements OnInit, OnDestroy {
  constructor(
    private messageService: MessageService,
    private farmerAccountService: FarmerAccountService,
    private partnerAccountService: PartnerAccountService,
    private messageCache: MessageCacheService,
    private silkOrderService: SilkOrderService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnDestroy(): void {
    this.conversationsUnsubscribe?.();
    this.conversationsUnsubscribe = null;

    this.allMessagesUnsubscribe?.();
    this.allMessagesUnsubscribe = null;

    Swal.close();
  }

  async ngOnInit(): Promise<void> {
    this.conversations = this.messageCache.conversations;
    await this.loadAccounts();
    this.loadAllConversations();

    const recipientUid = this.route.snapshot.queryParamMap.get('recipientUid');
    const recipientRole = this.route.snapshot.queryParamMap.get('recipientRole');

    if (recipientUid && recipientRole === 'farmer') {
      const farmer = this.availableContacts.find(
        contact => contact.uid === recipientUid && contact.role.toLowerCase() === 'farmer'
      );

      if (farmer) {
        this.startConversationWith(farmer);
      } else {
        await Swal.fire({
          icon: 'warning',
          title: 'Farmer Not Found',
          text: 'The selected farmer account could not be found.',
          confirmButtonColor: '#245638',
          background: '#fffdf8',
          color: '#493a2c'
        });
      }
    }
  }

  loadAllConversations(): void {
    this.isLoadingMessages = true;

    Swal.fire({
      title: 'Loading Messages',
      text: 'Fetching conversations from the database...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    this.allMessagesUnsubscribe?.();

    this.allMessagesUnsubscribe =
      this.messageService.listenToAllMessages(
        (messages) => {
          const groupedMessages = new Map<string, typeof messages>();

          messages.forEach((message) => {
            if (!groupedMessages.has(message.conversationId)) {
              groupedMessages.set(message.conversationId, []);
            }

            groupedMessages.get(message.conversationId)!.push(message);
          });

          groupedMessages.forEach((chatMessages, firebaseConversationId) => {
            const latestMessage = chatMessages[chatMessages.length - 1];

            let conversation = this.conversations.find(
              item => item.firebaseConversationId === firebaseConversationId
            );

            if (!conversation) {
              const isFarmer = latestMessage.recipientRole === 'farmer' ||
                latestMessage.senderRole === 'farmer';

              const role = isFarmer ? 'Farmer' : 'Partner';

              const account = isFarmer
                ? this.farmers.find(f => f.authUid === (
                    latestMessage.senderRole === 'farmer'
                      ? latestMessage.senderUid
                      : latestMessage.recipientUid
                  ))
                : this.partners.find(p => p.authUid === (
                    latestMessage.senderRole === 'partner'
                      ? latestMessage.senderUid
                      : latestMessage.recipientUid
                  ));

              const name = account?.fullName || role;

              conversation = {
                id: Date.now() + this.conversations.length,
                name,
                organization: isFarmer
                  ? (account as FarmerAccount)?.farmName || 'Farmer'
                  : (account as PartnerAccount)?.organizationName || 'Partner',
                role,
                location: isFarmer
                  ? (account as FarmerAccount)?.locality || ''
                  : (account as PartnerAccount)?.locality || '',
                initials: name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
                lastMessage: '',
                time: '',
                unread: false,
                messages: [],
                recipientUid: isFarmer
                  ? (account as FarmerAccount)?.authUid
                  : (account as PartnerAccount)?.authUid,
                recipientRole: isFarmer ? 'farmer' : 'partner',
                firebaseConversationId
              };

              this.conversations.push(conversation);
            }

            // Always refresh the actual recipient information
            const isFarmerConversation = conversation.role === 'Farmer';

            const recipientUid =
              latestMessage.senderRole === (isFarmerConversation ? 'farmer' : 'partner')
                ? latestMessage.senderUid
                : latestMessage.recipientUid;

            const recipientAccount = isFarmerConversation
              ? this.farmers.find(f => f.authUid === recipientUid)
              : this.partners.find(p => p.authUid === recipientUid);

            conversation.recipientUid =
              recipientAccount?.authUid || recipientUid;

            conversation.recipientRole = isFarmerConversation
              ? 'farmer'
              : 'partner';

            const staffUid = getAuth().currentUser?.uid;

            conversation.unread = chatMessages.some(message =>
              message.recipientUid === staffUid &&
              message.recipientRole === 'staff' &&
              message.read === false
            );

            // ADDED: Preserve delivery proposal information
            conversation.messages = chatMessages.map(message => ({
              id: message.id,
              sender: message.senderRole === 'staff' ? 'staff' : 'other',
              text: message.text,
              time: message.createdAt?.toDate
                ? message.createdAt.toDate().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '',
              messageType: message.messageType || 'text',
              orderDocId: message.orderDocId,
              orderId: message.orderId,
              proposedDeliveryDate: message.proposedDeliveryDate,
              proposalStatus: message.proposalStatus
            }));

            conversation.lastMessage = latestMessage.text;
            conversation.time = conversation.messages[conversation.messages.length - 1]?.time || '';
          });

          this.conversations.sort((a, b) => {
            const aTime = a.messages[a.messages.length - 1]?.time || '';
            const bTime = b.messages[b.messages.length - 1]?.time || '';
            return bTime.localeCompare(aTime);
          });

          this.messageCache.conversations = [...this.conversations];
          this.messageCache.conversationsLoaded = true;

          this.isLoadingMessages = false;
          Swal.close();

          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Unable to load conversations:', error);

          this.isLoadingMessages = false;
          Swal.close();

          this.cdr.detectChanges();

          void Swal.fire({
            icon: 'error',
            title: 'Unable to Load Messages',
            text: 'Please check your connection and try again.'
          });
        }
      );
  }

  openNewConversation(): void {
    console.log('New Conversation button clicked');

    this.contactSearchTerm = '';
    this.contactFilter = 'All';
    this.showNewConversationModal = true;
    console.log('Modal state:', this.showNewConversationModal);
  }

  closeNewConversation(): void {
    this.showNewConversationModal = false;
  }

  startConversationWith(
    contact: {
      uid: string;
      name: string;
      organization: string;
      role: 'Farmer' | 'Partner';
      location: string;
    }
  ): void {
    const conversationId =
      `staff_${contact.role.toLowerCase()}_${contact.uid}`;

    console.log('Selected contact:', contact);
    console.log('Generated conversation ID:', conversationId);

    const existingConversation = this.conversations.find(
      conversation =>
        conversation.firebaseConversationId === conversationId
    );

    if (existingConversation) {
      this.selectedConversationId = existingConversation.id;
      this.activeFilter = 'All';
      this.closeNewConversation();
      this.selectConversation(existingConversation);
      return;
    }

    const newConversation: Conversation = {
      id: Date.now(),
      name: contact.name,
      organization: contact.organization,
      role: contact.role,
      location: contact.location,
      initials: contact.name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      lastMessage: 'Start a conversation',
      time: '',
      unread: false,
      messages: [],
      recipientUid: contact.uid,
      recipientRole:
        contact.role === 'Farmer' ? 'farmer' : 'partner',
      firebaseConversationId: conversationId
    };

    this.conversations = [
      newConversation,
      ...this.conversations
    ];

    this.messageCache.conversations = this.conversations;
    this.messageCache.conversationsLoaded = true;

    this.activeFilter = 'All';
    this.searchTerm = '';
    this.selectedConversationId = newConversation.id;

    this.closeNewConversation();
    this.listenToSelectedConversation(newConversation);
  }

  private listenToSelectedConversation(
    conversation: Conversation
  ): void {
    this.conversationsUnsubscribe?.();
    this.conversationsUnsubscribe = null;

    if (!conversation.firebaseConversationId) {
      return;
    }

    this.conversationsUnsubscribe =
      this.messageService.listenToMessages(
        conversation.firebaseConversationId,
        (messages) => {
          const currentConversation = this.conversations.find(
            item => item.id === conversation.id
          );

          if (!currentConversation) return;

          // ADDED: Preserve delivery proposal information
          currentConversation.messages = messages.map(message => ({
            id: message.id,
            sender: message.senderRole === 'staff' ? 'staff' : 'other',
            text: message.text,
            time: message.createdAt?.toDate
              ? message.createdAt.toDate().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '',
            messageType: message.messageType || 'text',
            orderDocId: message.orderDocId,
            orderId: message.orderId,
            proposedDeliveryDate: message.proposedDeliveryDate,
            proposalStatus: message.proposalStatus
          }));

          const latestMessage = currentConversation.messages[
            currentConversation.messages.length - 1
          ];

          currentConversation.lastMessage =
            latestMessage?.text || 'Start a conversation';

          currentConversation.time = latestMessage?.time || '';

          // Mark incoming Farmer/Partner messages as read by Staff
          const staffUid = getAuth().currentUser?.uid;

          if (
            staffUid &&
            messages.some(message =>
              message.recipientUid === staffUid &&
              message.recipientRole === 'staff' &&
              message.read === false
            )
          ) {
            currentConversation.unread = false;

            this.messageService.markMessagesAsRead(
              conversation.firebaseConversationId!,
              staffUid
            ).catch(error => {
              console.error('Failed to mark Staff messages as read:', error);
            });
          }

          // Save updated conversations to cache
          this.messageCache.conversations = [...this.conversations];
          this.messageCache.conversationsLoaded = true;
          this.cdr?.detectChanges();
        }
      );
  }

  searchTerm = '';
  messageText = '';

  activeFilter: 'All' | 'Farmers' | 'Partners' | 'Unread' = 'All';
  selectedConversationId: number | null = null;
  conversationsUnsubscribe: Unsubscribe | null = null;
  allMessagesUnsubscribe: Unsubscribe | null = null;

  isSending = false;
  isLoadingAccounts = false;
  accountsLoadError = '';
  isLoadingMessages = false;

  farmers: FarmerAccount[] = [];
  partners: PartnerAccount[] = [];

  showContactInfo = false;
  showNewConversationModal = false;
  contactSearchTerm = '';
  contactFilter: 'All' | 'Farmers' | 'Partners' = 'All';

  conversations: Conversation[] = [];

  // ADDED: Delivery Date Proposal properties
  showDeliveryProposalModal = false;
  isLoadingProposalOrders = false;
  isSendingProposal = false;

  availableProposalOrders: SilkOrder[] = [];
  selectedProposalOrderId = '';
  proposedDeliveryDate = '';

  get selectedConversation(): Conversation | undefined {
    if (this.selectedConversationId === null) {
      return undefined;
    }

    return this.conversations.find(
      conversation => conversation.id === this.selectedConversationId
    );
  }

  async loadAccounts(): Promise<void> {
    if (this.messageCache.accountsLoaded) {
      this.farmers = this.messageCache.farmers;
      this.partners = this.messageCache.partners;
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingAccounts = true;
    this.accountsLoadError = '';

    Swal.fire({
      title: 'Loading Contacts',
      text: 'Fetching Farmer and Partner accounts...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const [farmers, partners] = await Promise.all([
        this.farmerAccountService.getFarmers(),
        this.partnerAccountService.getPartners()
      ]);

      this.farmers = farmers;
      this.partners = partners;
      this.messageCache.farmers = farmers;
      this.messageCache.partners = partners;
      this.messageCache.accountsLoaded = true;
      Swal.close();
    } catch (error) {
      console.error('Failed to load Farmer and Partner accounts:', error);
      this.accountsLoadError = 'Unable to load contacts. Please try again.';

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Contacts',
        text: 'Please check your connection and try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      this.isLoadingAccounts = false;
      this.cdr.detectChanges();
    }
  }

  get availableContacts() {
    const farmerContacts = this.farmers
      .filter(farmer => farmer.authUid)
      .map(farmer => ({
        uid: farmer.authUid!,
        name: farmer.fullName,
        organization: farmer.farmName || 'Farmer',
        role: 'Farmer' as const,
        location: farmer.locality || ''
      }));

    const partnerContacts = this.partners
      .filter(partner => partner.authUid)
      .map(partner => ({
        uid: partner.authUid!,
        name: partner.fullName,
        organization: partner.organizationName || 'Partner',
        role: 'Partner' as const,
        location: partner.locality || ''
      }));

    return [...farmerContacts, ...partnerContacts].filter(contact => {
      const matchesFilter =
        this.contactFilter === 'All' ||
        (this.contactFilter === 'Farmers' && contact.role === 'Farmer') ||
        (this.contactFilter === 'Partners' && contact.role === 'Partner');

      const search = this.contactSearchTerm.trim().toLowerCase();
      const matchesSearch =
        contact.name.toLowerCase().includes(search) ||
        contact.organization.toLowerCase().includes(search) ||
        contact.location.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }

  get filteredConversations(): Conversation[] {
    const term = this.searchTerm.toLowerCase().trim();

    return this.conversations.filter(conversation => {
      const matchesSearch =
        conversation.name.toLowerCase().includes(term) ||
        conversation.organization.toLowerCase().includes(term) ||
        conversation.lastMessage.toLowerCase().includes(term);

      const matchesFilter =
        this.activeFilter === 'All' ||
        (this.activeFilter === 'Farmers' && conversation.role === 'Farmer') ||
        (this.activeFilter === 'Partners' && conversation.role === 'Partner') ||
        (this.activeFilter === 'Unread' && conversation.unread);

      return matchesSearch && matchesFilter;
    });
  }

  get unreadCount(): number {
    return this.conversations.filter(conversation => conversation.unread).length;
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversationId = conversation.id;
    conversation.unread = false;

    this.listenToSelectedConversation(conversation);
  }

  backToInbox(): void {
    this.conversationsUnsubscribe?.();
    this.conversationsUnsubscribe = null;

    this.selectedConversationId = null;
    this.showContactInfo = false;
    this.messageText = '';
  }

  setFilter(filter: 'All' | 'Farmers' | 'Partners' | 'Unread'): void {
    this.activeFilter = filter;
  }

  // ADDED: Open delivery-date proposal modal and load actual Partner orders
  async openDeliveryDateProposal(): Promise<void> {
    const conversation = this.selectedConversation;

    if (!conversation || conversation.role !== 'Partner') {
      return;
    }

    if (!conversation.recipientUid) {
      await Swal.fire({
        icon: 'warning',
        title: 'Partner Not Found',
        text: 'Unable to identify the Partner account.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    this.isLoadingProposalOrders = true;
    this.availableProposalOrders = [];
    this.selectedProposalOrderId = '';
    this.proposedDeliveryDate = '';

    try {
      const orders = await this.silkOrderService.getPartnerOrders(
        conversation.recipientUid
      );

      this.availableProposalOrders = orders.filter(order =>
        !!order.id && order.status === 'Pending Review'
      );

      if (this.availableProposalOrders.length === 0) {
        await Swal.fire({
          icon: 'info',
          title: 'No Pending Orders',
          text: 'This Partner has no orders awaiting review for a delivery-date proposal.',
          confirmButtonColor: '#245638'
        });
        return;
      }

      this.showDeliveryProposalModal = true;

    } catch (error) {
      console.error('Failed to load Partner orders:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Orders',
        text: 'Please try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isLoadingProposalOrders = false;
      this.cdr.detectChanges();
    }
  }

  closeDeliveryProposalModal(): void {
    this.showDeliveryProposalModal = false;
    this.selectedProposalOrderId = '';
    this.proposedDeliveryDate = '';
  }

  // ADDED: Send proposal through the existing MessageService
  async sendDeliveryDateProposal(): Promise<void> {
    const conversation = this.selectedConversation;

    if (
      !conversation ||
      conversation.role !== 'Partner' ||
      !conversation.firebaseConversationId ||
      !conversation.recipientUid ||
      !this.selectedProposalOrderId ||
      !this.proposedDeliveryDate ||
      this.isSendingProposal
    ) {
      console.log('Proposal validation failed:', {
        conversationExists: !!conversation,
        role: conversation?.role,
        conversationId: conversation?.firebaseConversationId,
        recipientUid: conversation?.recipientUid,
        selectedProposalOrderId: this.selectedProposalOrderId,
        proposedDeliveryDate: this.proposedDeliveryDate,
        isSendingProposal: this.isSendingProposal
      });
      return;
    }

    const order = this.availableProposalOrders.find(
      item => item.id === this.selectedProposalOrderId
    );

    if (!order || !order.id) {
      await Swal.fire({
        icon: 'error',
        title: 'Order Not Found',
        text: 'Please select a valid Partner order.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    if (this.proposedDeliveryDate === order.deliveryDate) {
      await Swal.fire({
        icon: 'warning',
        title: 'Same Delivery Date',
        text: 'The proposed date must be different from the Partner’s requested delivery date.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(`${this.proposedDeliveryDate}T00:00:00`);

    if (selectedDate < today) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Delivery Date',
        text: 'Please select a future delivery date.',
        confirmButtonColor: '#245638'
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Send Delivery Date Proposal?',
      html: `
        <p>Order: <strong>${order.orderId}</strong></p>
        <p>Proposed date: <strong>${this.proposedDeliveryDate}</strong></p>
        <p>The Partner must confirm this date before the order can be approved.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send Proposal',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#245638',
      background: '#fffdf8',
      color: '#493a2c'
    });

    if (!confirmation.isConfirmed) return;

    this.isSendingProposal = true;

    try {
      console.log('DELIVERY PROPOSAL DEBUG:', {
        conversationId: conversation.firebaseConversationId,
        recipientUid: conversation.recipientUid,
        orderDocId: order.id,
        orderId: order.orderId,
        proposedDeliveryDate: this.proposedDeliveryDate
      });

      await this.messageService.sendDeliveryDateProposal(
        conversation.firebaseConversationId,
        conversation.recipientUid,
        order.id,
        order.orderId,
        this.proposedDeliveryDate
      );

      this.closeDeliveryProposalModal();

      await Swal.fire({
        icon: 'success',
        title: 'Proposal Sent!',
        text: 'The proposed delivery date has been sent to the Partner.',
        confirmButtonColor: '#245638'
      });

    } catch (error) {
      console.error('Failed to send delivery-date proposal:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Proposal Not Sent',
        text: 'Unable to send the delivery-date proposal. Please try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isSendingProposal = false;
      this.cdr.detectChanges();
    }
  }


  async sendMessage(): Promise<void> {
    const text = this.messageText.trim();
    const conversation = this.selectedConversation;

    console.log('Selected conversation:', conversation);
    console.log('Firebase ID:', conversation?.firebaseConversationId);
    console.log('Recipient UID:', conversation?.recipientUid);
    console.log('Recipient role:', conversation?.recipientRole);

    if (!text || !conversation || this.isSending) {
      return;
    }

    if (
      !conversation.firebaseConversationId ||
      !conversation.recipientUid ||
      !conversation.recipientRole
    ) {
      Swal.fire({
        icon: 'info',
        title: 'Firebase connection needed',
        text: 'Please start a conversation by selecting an actual Farmer or Partner account.',
        confirmButtonColor: '#17365D'
      });
      return;
    }

    this.isSending = true;

    try {
      await this.messageService.sendMessage(
        conversation.firebaseConversationId,
        conversation.recipientUid,
        conversation.recipientRole,
        text,
        'staff'
      );

      this.messageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);

      Swal.fire({
        icon: 'error',
        title: 'Message not sent',
        text: 'Unable to send your message. Please try again.',
        confirmButtonColor: '#17365D'
      });
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
    }
  }

  startNewConversation(): void {
    const name = prompt('Enter the farmer or partner name:');

    if (!name?.trim()) {
      return;
    }

    const newId =
      Math.max(...this.conversations.map(conversation => conversation.id), 0) + 1;

    const newConversation: Conversation = {
      id: newId,
      name: name.trim(),
      organization: 'New conversation',
      role: 'Farmer',
      location: 'Not specified',
      initials: name.trim().substring(0, 2).toUpperCase(),
      lastMessage: 'Start a conversation',
      time: 'Now',
      unread: false,
      messages: [],
    };

    this.conversations.unshift(newConversation);

    this.messageCache.conversations = this.conversations;
    this.messageCache.conversationsLoaded = true;
    this.selectedConversationId = newId;
    this.activeFilter = 'All';
    this.searchTerm = '';
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    alert(
      `Selected file: ${file.name}\nFile uploading will be implemented later.`
    );

    input.value = '';
  }

  onEnterPressed(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    this.sendMessage();
  }
}
