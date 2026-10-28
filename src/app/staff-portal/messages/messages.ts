
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class Messages {
  searchTerm = '';
  messageText = '';

  activeFilter: 'All' | 'Farmers' | 'Partners' | 'Unread' = 'All';
  selectedConversationId: number | null = null;
  showContactInfo = false;
  
  conversations: Conversation[] = [
    {
      id: 1,
      name: 'Maria Santos',
      organization: 'Farmer · Claveria, Misamis Oriental',
      role: 'Farmer',
      location: 'Claveria, Misamis Oriental',
      initials: 'MS',
      lastMessage: 'The remaining 80 kg is on track...',
      time: '8:42 AM',
      unread: true,
      messages: [
        {
          id: 1,
          sender: 'staff',
          text: 'Good morning, Ma’am Maria. May we confirm the remaining 80 kg of cocoons for 26 October under SR-26-041?',
          time: '8:30 AM',
        },
        {
          id: 2,
          sender: 'other',
          text: 'Good morning. The remaining 80 kg is on track for 26 October. Collection after 1:00 PM works for us. Thank you.',
          time: '8:42 AM',
        },
        {
          id: 3,
          sender: 'staff',
          text: 'Thank you for confirming. Paolo Garcia is scheduled to collect at 1:30 PM in Claveria. We will record the actual weight upon receipt.',
          time: '8:45 AM',
        },
      ],
    },
    {
      id: 2,
      name: 'Liza Mercado',
      organization: 'Habi Silk Cooperative',
      role: 'Partner',
      location: 'Misamis Oriental',
      initials: 'LM',
      lastMessage: 'Our silk yarn requirement will be read...',
      time: 'Yesterday',
      unread: false,
      messages: [
        {
          id: 1,
          sender: 'other',
          text: 'Good afternoon. We would like to check the availability of silk yarn for our next order.',
          time: 'Yesterday',
        },
        {
          id: 2,
          sender: 'staff',
          text: 'Good afternoon, Ma’am Liza. We will review the available inventory and update you on the quantity.',
          time: 'Yesterday',
        },
      ],
    },
    {
      id: 3,
      name: 'Jose Cruz',
      organization: 'Farmer · Balingasag',
      role: 'Farmer',
      location: 'Balingasag, Misamis Oriental',
      initials: 'JC',
      lastMessage: 'Yes, 27 October is confirmed.',
      time: 'Yesterday',
      unread: true,
      messages: [
        {
          id: 1,
          sender: 'staff',
          text: 'Can you confirm your cocoon collection schedule for 27 October?',
          time: 'Yesterday',
        },
        {
          id: 2,
          sender: 'other',
          text: 'Yes, 27 October is confirmed.',
          time: 'Yesterday',
        },
      ],
    },
    {
      id: 4,
      name: 'Carlo Lim',
      organization: 'Mindanao Silk Studio',
      role: 'Partner',
      location: 'Cagayan de Oro',
      initials: 'CL',
      lastMessage: 'Please include the lot labels.',
      time: '22 Oct',
      unread: false,
      messages: [
        {
          id: 1,
          sender: 'other',
          text: 'Please include the lot labels with the next silk yarn delivery.',
          time: '22 Oct',
        },
      ],
    },
    {
      id: 5,
      name: 'Ana Mendoza',
      organization: 'Farmer · Malitbog',
      role: 'Farmer',
      location: 'Malitbog, Misamis Oriental',
      initials: 'AM',
      lastMessage: 'I will check the harvest estimate.',
      time: '21 Oct',
      unread: false,
      messages: [
        {
          id: 1,
          sender: 'other',
          text: 'I will check the harvest estimate and send you the expected cocoon quantity.',
          time: '21 Oct',
        },
      ],
    },
    {
      id: 6,
      name: 'Nina Abad',
      organization: 'Northern Silk Weavers',
      role: 'Partner',
      location: 'Northern Mindanao',
      initials: 'NA',
      lastMessage: 'Thank you for confirming our order.',
      time: '20 Oct',
      unread: false,
      messages: [
        {
          id: 1,
          sender: 'other',
          text: 'Thank you for confirming our order. We will wait for the delivery schedule.',
          time: '20 Oct',
        },
      ],
    },
  ];

  get selectedConversation(): Conversation | undefined {
  if (this.selectedConversationId === null) {
    return undefined;
  }

  return this.conversations.find(
    conversation => conversation.id === this.selectedConversationId
  );
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
  }
  backToInbox(): void {
  this.selectedConversationId = null;
  this.showContactInfo = false;
  this.messageText = '';
}

  setFilter(filter: 'All' | 'Farmers' | 'Partners' | 'Unread'): void {
    this.activeFilter = filter;
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    const conversation = this.selectedConversation;

    if (!text || !conversation) {
      return;
    }

    conversation.messages.push({
      id: Date.now(),
      sender: 'staff',
      text,
      time: new Date().toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    });

    conversation.lastMessage = text;
    conversation.time = 'Just now';
    this.messageText = '';
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
