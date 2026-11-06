
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Unsubscribe } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Swal from 'sweetalert2';

import {
  MessageService,
  ChatMessage
} from '../../services/message.service';

import {
  FarmerAccount,
  FarmerAccountService
} from '../../services/farmer-account.service';

import {
  LucideAngularModule,
  Search,
  MessageCircle,
  Send,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  Clock3,
  UserRound,
  MessagesSquare,
  Plus,
  X,
  FileText,
  Image,
  Bell,
  Building2,
   Users
} from 'lucide-angular';

interface FarmerContact {
  uid: string;
  name: string;
  farmName: string;
  locality: string;
}

interface FarmerConversation {
  conversationId: string;
  recipientUid: string;
  recipientRole: 'staff' | 'farmer';
  recipientName: string;
  recipientOrganization: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

@Component({
  selector: 'app-farmer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-messages.html',
  styleUrl: './farmer-messages.css',
})
export class FarmerMessages implements OnInit, OnDestroy {

  messages: ChatMessage[] = [];
  messageText = '';

  conversations: FarmerConversation[] = [];
  farmerContacts: FarmerContact[] = [];

  selectedConversation: FarmerConversation | null = null;

  isLoadingMessages = true;
  isLoadingConversations = true;
  isLoadingFarmers = true;
  isSending = false;

  showChat = false;

  searchTerm = '';

  messagesUnsubscribe: Unsubscribe | null = null;
  allMessagesUnsubscribe: Unsubscribe | null = null;

  farmerUid = '';

  private readonly staffUid =
    'TpT0obVcHHhvMffvpcaVtSL1WE52';

  private readonly staffName = 'PTRI STAFF';

  constructor(
    private messageService: MessageService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      this.isLoadingConversations = false;
      this.isLoadingMessages = false;
      this.isLoadingFarmers = false;
      return;
    }

    this.farmerUid = currentUser.uid;

    this.loadRegisteredFarmers();
    this.listenToFarmerConversations();
  }

  ngOnDestroy(): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;

    this.allMessagesUnsubscribe?.();
    this.allMessagesUnsubscribe = null;

    Swal.close();
  }

  // LOAD REGISTERED FARMERS
  async loadRegisteredFarmers(): Promise<void> {
    this.isLoadingFarmers = true;

    try {
      const farmers = await this.farmerAccountService.getFarmers();

      this.farmerContacts = farmers
        .filter((farmer: FarmerAccount) =>
          !!farmer.authUid &&
          farmer.authUid !== this.farmerUid &&
          farmer.status === 'Active'
        )
        .map((farmer: FarmerAccount) => ({
          uid: farmer.authUid!,
          name: farmer.fullName || 'Farmer',
          farmName: farmer.farmName || 'Registered Farmer',
          locality: farmer.locality || 'Location not specified'
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error('Failed to load registered farmers:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Farmers',
        text: 'Please check your connection and try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isLoadingFarmers = false;
      this.cdr.detectChanges();
    }
  }

  // LISTEN TO ALL MESSAGES INVOLVING THE CURRENT FARMER
  listenToFarmerConversations(): void {
    this.isLoadingConversations = true;

    this.allMessagesUnsubscribe?.();

    this.allMessagesUnsubscribe =
      this.messageService.listenToFarmerMessages(
        this.farmerUid,
        (allMessages) => {

          const grouped = new Map<string, ChatMessage[]>();

          allMessages.forEach(message => {
            if (!message.conversationId) return;

            const isParticipant =
              message.senderUid === this.farmerUid ||
              message.recipientUid === this.farmerUid;

            if (!isParticipant) return;

            if (!grouped.has(message.conversationId)) {
              grouped.set(message.conversationId, []);
            }

            grouped.get(message.conversationId)!.push(message);
          });

          const updatedConversations: FarmerConversation[] = [];

          grouped.forEach((chatMessages, conversationId) => {

            chatMessages.sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() ?? 0;
              const timeB = b.createdAt?.toMillis?.() ?? 0;
              return timeA - timeB;
            });

            const latestMessage =
              chatMessages[chatMessages.length - 1];

            if (!latestMessage) return;

            const isStaffConversation =
              latestMessage.senderRole === 'staff' ||
              latestMessage.recipientRole === 'staff';

            const otherUid =
              latestMessage.senderUid === this.farmerUid
                ? latestMessage.recipientUid
                : latestMessage.senderUid;

            const otherRole =
              latestMessage.senderUid === this.farmerUid
                ? latestMessage.recipientRole
                : latestMessage.senderRole;

            const contact = this.farmerContacts.find(
              farmer => farmer.uid === otherUid
            );

            updatedConversations.push({
              conversationId,
              recipientUid: isStaffConversation
                ? this.staffUid
                : otherUid,
              recipientRole: isStaffConversation
                ? 'staff'
                : 'farmer',
              recipientName: isStaffConversation
                ? this.staffName
                : contact?.name || 'Farmer',
              recipientOrganization: isStaffConversation
                ? 'Official PTRI Communication'
                : contact?.farmName || 'Registered Farmer',
              lastMessage: latestMessage,
              unreadCount: chatMessages.filter(message =>
                message.recipientUid === this.farmerUid &&
                message.read === false
              ).length
            });
          });

          this.conversations = updatedConversations.sort((a, b) => {
            const timeA =
              a.lastMessage?.createdAt?.toMillis?.() ?? 0;

            const timeB =
              b.lastMessage?.createdAt?.toMillis?.() ?? 0;

            return timeB - timeA;
          });

          // Refresh selected conversation when new messages arrive
          if (this.selectedConversation) {
            const updated = this.conversations.find(
              conversation =>
                conversation.conversationId ===
                this.selectedConversation?.conversationId
            );

            if (updated) {
              this.selectedConversation = updated;
            }
          }

          this.isLoadingConversations = false;
          this.cdr.detectChanges();
        },
        error => {
          console.error('Failed to load farmer conversations:', error);

          this.isLoadingConversations = false;
          this.cdr.detectChanges();
        }
      );
  }

  // CREATE OR OPEN STAFF CONVERSATION
  openStaffConversation(): void {
    const conversationId = `staff_farmer_${this.farmerUid}`;

    const conversation: FarmerConversation = {
      conversationId,
      recipientUid: this.staffUid,
      recipientRole: 'staff',
      recipientName: this.staffName,
      recipientOrganization: 'Official PTRI Communication',
      lastMessage: null,
      unreadCount: 0
    };

    this.openConversation(conversation);
  }

  // CREATE OR OPEN FARMER-TO-FARMER CONVERSATION
  openFarmerConversation(farmer: FarmerContact): void {

    if (farmer.uid === this.farmerUid) return;

    const sortedUids = [
      this.farmerUid,
      farmer.uid
    ].sort();

    const conversationId =
      `farmer_farmer_${sortedUids[0]}_${sortedUids[1]}`;

    const conversation: FarmerConversation = {
      conversationId,
      recipientUid: farmer.uid,
      recipientRole: 'farmer',
      recipientName: farmer.name,
      recipientOrganization: farmer.farmName,
      lastMessage: null,
      unreadCount: 0
    };

    this.openConversation(conversation);
  }

  // OPEN SELECTED CONVERSATION
  openConversation(conversation: FarmerConversation): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;

    this.selectedConversation = conversation;
    this.messages = [];

    this.showChat = true;
    this.isLoadingMessages = true;

    this.messagesUnsubscribe =
      this.messageService.listenToMessages(
        conversation.conversationId,
        async (messages) => {

          this.messages = messages;
          this.isLoadingMessages = false;

          this.cdr.detectChanges();

          try {
            await this.messageService.markMessagesAsRead(
              conversation.conversationId,
              this.farmerUid
            );

            conversation.unreadCount = 0;

          } catch (error) {
            console.error('Failed to mark messages as read:', error);
          }

          this.cdr.detectChanges();
        }
      );
  }

  // BACK TO CONVERSATIONS
  backToConversations(): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;

    this.selectedConversation = null;
    this.messages = [];
    this.messageText = '';

    this.showChat = false;
    this.isLoadingMessages = false;

    this.cdr.detectChanges();
  }

  // SEND MESSAGE TO SELECTED RECIPIENT
  async sendMessage(): Promise<void> {
    const text = this.messageText.trim();
    const conversation = this.selectedConversation;

    if (!text || !conversation || this.isSending) {
      return;
    }

    this.isSending = true;

    Swal.fire({
      title: 'Sending Message...',
      text: 'Please wait.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await this.messageService.sendMessage(
        conversation.conversationId,
        conversation.recipientUid,
        conversation.recipientRole,
        text,
        'farmer'
      );

      this.messageText = '';
      Swal.close();

    } catch (error) {
      console.error('Failed to send farmer message:', error);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Message Not Sent',
        text: 'Unable to send your message. Please try again.',
        confirmButtonColor: '#245638'
      });

    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
    }
  }
  get staffConversation(): FarmerConversation | undefined {
  return this.conversations.find(
    conversation => conversation.recipientRole === 'staff'
  );
}

  // SEARCH REGISTERED FARMERS
  get filteredFarmers(): FarmerContact[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.farmerContacts.filter(farmer =>
      farmer.name.toLowerCase().includes(search) ||
      farmer.farmName.toLowerCase().includes(search) ||
      farmer.locality.toLowerCase().includes(search)
    );
  }

  // UNREAD CONVERSATION COUNT
  get unreadCount(): number {
    return this.conversations.reduce(
      (total, conversation) =>
        total + conversation.unreadCount,
      0
    );
  }

  readonly Search = Search;
  readonly MessageCircle = MessageCircle;
  readonly Send = Send;
  readonly Users = Users;
  readonly Paperclip = Paperclip;
  readonly ArrowLeft = ArrowLeft;
  readonly MoreVertical = MoreVertical;
  readonly CheckCheck = CheckCheck;
  readonly Clock3 = Clock3;
  readonly UserRound = UserRound;
  readonly MessagesSquare = MessagesSquare;
  readonly Plus = Plus;
  readonly X = X;
  readonly FileText = FileText;
  readonly Image = Image;
  readonly Bell = Bell;
  readonly Building2 = Building2;
}
