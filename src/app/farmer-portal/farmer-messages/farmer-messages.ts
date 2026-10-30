
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
  Building2
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-messages',
    imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-messages.html',
  styleUrl: './farmer-messages.css',
})
export class FarmerMessages implements OnInit, OnDestroy {
    messages: ChatMessage[] = [];

  messageText = '';

  isLoadingMessages = true;
  isSending = false;

  messagesUnsubscribe: Unsubscribe | null = null;

  private farmerUid = '';
  private conversationId = '';

  constructor(
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      this.isLoadingMessages = false;
      return;
    }

    this.farmerUid = currentUser.uid;
    this.conversationId = `staff_farmer_${currentUser.uid}`;

    this.messagesUnsubscribe = this.messageService.listenToMessages(
      this.conversationId,
      (messages) => {
        this.messages = messages;
        this.isLoadingMessages = false;
        this.cdr.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.messagesUnsubscribe?.();
    this.messagesUnsubscribe = null;
  }
  readonly Search = Search;
  readonly MessageCircle = MessageCircle;
  readonly Send = Send;
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

  async sendMessage(): Promise<void> {
  const text = this.messageText.trim();

  if (!text || this.isSending) {
    return;
  }

  // Get the PTRI Staff UID from an existing staff message
  const staffMessage = this.messages.find(
    message => message.senderRole === 'staff'
  );

  if (!staffMessage) {
    await Swal.fire({
      icon: 'info',
      title: 'No Staff Conversation Yet',
      text: 'Please wait for PTRI Staff to start the conversation first.',
      confirmButtonColor: '#477451'
    });
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
      this.conversationId,
      staffMessage.senderUid,
      'staff',
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
      confirmButtonColor: '#477451'
    });

  } finally {
    this.isSending = false;
    this.cdr.detectChanges();
  }
}
}
