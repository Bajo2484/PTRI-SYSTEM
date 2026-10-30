import { MessageCacheService } from '../../cache/message-cache.service';
import Swal from 'sweetalert2';
import { Component, OnInit,ChangeDetectorRef, OnDestroy, } from '@angular/core';
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

interface Message {
  id: number;
  sender: 'staff' | 'other';
  text: string;
  time: string;
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
  private cdr: ChangeDetectorRef,
  private messageCache: MessageCacheService
) {}

ngOnDestroy(): void {
  this.conversationsUnsubscribe?.();
  this.conversationsUnsubscribe = null;
}

ngOnInit(): void {
  this.conversations = this.messageCache.conversations;
  void this.loadAccounts();
}

openNewConversation(): void {
  console.log('New Conversation button clicked');

  this.contactSearchTerm = '';
  this.contactFilter = 'All';
  this.showNewConversationModal = true
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

        currentConversation.messages = messages.map(message => ({
          id: message.id as unknown as number,
          sender: message.senderRole === 'staff' ? 'staff' : 'other',
          text: message.text,
          time: message.createdAt?.toDate
            ? message.createdAt.toDate().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            : ''
        }));

        const latestMessage = currentConversation.messages[
          currentConversation.messages.length - 1
        ];

        currentConversation.lastMessage =
          latestMessage?.text || 'Start a conversation';

        currentConversation.time = latestMessage?.time || '';
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
