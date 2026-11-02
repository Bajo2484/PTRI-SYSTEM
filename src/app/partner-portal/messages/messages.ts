
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Unsubscribe,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import Swal from 'sweetalert2';

import { auth, db } from '../../services/firebase';
import { MessageService, ChatMessage } from '../../services/message.service';

interface Message {
  id: string;
  sender: 'staff' | 'other';
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  firebaseConversationId: string;
  name: string;
  messages: Message[];
  lastMessage: string;
  time: string;
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
    private cdr: ChangeDetectorRef
  ) {}

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;

  messageText = '';
  staffUid = '';
  isLoadingMessages = false;
  isSending = false;
  loadError = '';

  private messagesUnsubscribe: Unsubscribe | null = null;

  ngOnInit(): void {
    void this.initializeMessages();
  }

  ngOnDestroy(): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;

    Swal.close();
  }

  async initializeMessages(): Promise<void> {
    await this.loadStaffAccount();

    if (!this.staffUid) {
      return;
    }

    this.loadConversation();
  }

  async loadStaffAccount(): Promise<void> {
    try {
      const staffQuery = query(
        collection(db, 'users'),
        where('role', '==', 'staff')
      );

      const staffSnapshot = await getDocs(staffQuery);

      if (staffSnapshot.empty) {
        throw new Error('No PTRI Staff account found.');
      }

      this.staffUid = staffSnapshot.docs[0].id;

      console.log('PTRI Staff UID loaded:', this.staffUid);

    } catch (error) {
      console.error('Error loading PTRI Staff account:', error);

      this.loadError = 'Unable to find the PTRI Staff account.';

      this.cdr.detectChanges();
    }
  }

  loadConversation(): void {
    const user = auth.currentUser;

    if (!user) {
      this.loadError = 'Please log in again to view your messages.';
      this.cdr.detectChanges();
      return;
    }

    const conversationId = `staff_partner_${user.uid}`;

    this.isLoadingMessages = true;
    this.loadError = '';

    Swal.fire({
      title: 'Loading Messages',
      text: 'Fetching your conversation with PTRI Staff...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    this.messagesUnsubscribe?.();

    this.selectedConversation = {
      id: conversationId,
      firebaseConversationId: conversationId,
      name: 'PTRI Staff',
      messages: [],
      lastMessage: '',
      time: ''
    };

    this.conversations = [this.selectedConversation];

    let firstSnapshot = true;

    this.messagesUnsubscribe = this.messageService.listenToMessages(
      conversationId,
      (messages: ChatMessage[]) => {
        if (!this.selectedConversation) return;

        this.selectedConversation.messages = messages.map(message => ({
          id: message.id,
          sender: message.senderRole === 'staff' ? 'staff' : 'other',
          text: message.text,
          time: message.createdAt?.toDate
            ? message.createdAt.toDate().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            : ''
        }));

        const latestMessage =
          this.selectedConversation.messages[
            this.selectedConversation.messages.length - 1
          ];

        this.selectedConversation.lastMessage = latestMessage?.text || '';
        this.selectedConversation.time = latestMessage?.time || '';

        if (firstSnapshot) {
          firstSnapshot = false;
          this.isLoadingMessages = false;
          Swal.close();
        }

        this.cdr.detectChanges();
      }
    );
  }

  async sendMessage(): Promise<void> {
    const user = auth.currentUser;
    const text = this.messageText.trim();

    if (!user || !text || this.isSending || !this.staffUid) {
      return;
    }

    this.isSending = true;

    try {
      await this.messageService.sendMessage(
        `staff_partner_${user.uid}`,
        this.staffUid,
        'staff',
        text,
        'partner'
      );

      this.messageText = '';

    } catch (error) {
      console.error('Failed to send Partner message:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Message Not Sent',
        text: 'Unable to send your message. Please try again.'
      });

    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
    }
  }
}
