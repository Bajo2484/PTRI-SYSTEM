
import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  Unsubscribe,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';

import { db, auth } from './firebase';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: 'staff' | 'farmer' | 'partner';
  recipientUid: string;
  recipientRole: 'staff' | 'farmer' | 'partner';
  text: string;
  createdAt: any;
  read?: boolean;

  // Delivery date proposal information
  messageType?: 'text' | 'delivery-date-proposal';
  orderDocId?: string;
  orderId?: string;
  proposedDeliveryDate?: string;
  proposalStatus?: 'pending' | 'accepted' | 'declined';
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly messagesCollection = collection(db, 'messages');

  async sendMessage(
    conversationId: string,
    recipientUid: string,
    recipientRole: 'staff' | 'farmer' | 'partner',
    text: string,
    senderRole: 'staff' | 'farmer' | 'partner'
  ): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to send a message.');
    }

    const cleanText = text.trim();

    if (!cleanText) {
      throw new Error('Message cannot be empty.');
    }

    await addDoc(this.messagesCollection, {
      conversationId,
      senderUid: user.uid,
      senderRole,
      recipientUid,
      recipientRole,
      text: cleanText,
      messageType: 'text',
      createdAt: serverTimestamp(),
      read: false
    });
  }

  // Send a structured delivery date proposal from PTRI Staff
  async sendDeliveryDateProposal(
    conversationId: string,
    recipientUid: string,
    orderDocId: string,
    orderId: string,
    proposedDeliveryDate: string
  ): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to send a proposal.');
    }

    if (!conversationId || !recipientUid || !orderDocId || !orderId || !proposedDeliveryDate) {
      throw new Error('Missing delivery proposal information.');
    }

    await addDoc(this.messagesCollection, {
      conversationId,
      senderUid: user.uid,
      senderRole: 'staff',
      recipientUid,
      recipientRole: 'partner',
      text: `PTRI Staff proposed a new expected delivery date for Order ${orderId}.`,
      messageType: 'delivery-date-proposal',
      orderDocId,
      orderId,
      proposedDeliveryDate,
      proposalStatus: 'pending',
      createdAt: serverTimestamp(),
      read: false
    });
  }

  // Update proposal status after Partner responds
  async updateProposalStatus(
    messageId: string,
    status: 'accepted' | 'declined'
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to respond to a proposal.');
    }

    await updateDoc(doc(db, 'messages', messageId), {
      proposalStatus: status,
      proposalRespondedAt: serverTimestamp()
    });
  }

  listenToMessages(
    conversationId: string,
    callback: (messages: ChatMessage[]) => void
  ): Unsubscribe {
    const messagesQuery = query(
      this.messagesCollection,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data()
      })) as ChatMessage[];

      callback(messages);
    });
  }

  listenToFarmerMessages(
    farmerUid: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    let sentMessages: ChatMessage[] = [];
    let receivedMessages: ChatMessage[] = [];

    const emitMessages = () => {
      const combinedMessages = new Map<string, ChatMessage>();

      [...sentMessages, ...receivedMessages].forEach(message => {
        combinedMessages.set(message.id, message);
      });

      const allMessages = Array.from(combinedMessages.values());

      allMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() ?? 0;
        const timeB = b.createdAt?.toMillis?.() ?? 0;
        return timeA - timeB;
      });

      callback(allMessages);
    };

    const sentQuery = query(
      this.messagesCollection,
      where('senderUid', '==', farmerUid)
    );

    const receivedQuery = query(
      this.messagesCollection,
      where('recipientUid', '==', farmerUid)
    );

    const unsubscribeSent = onSnapshot(
      sentQuery,
      snapshot => {
        sentMessages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        emitMessages();
      },
      error => {
        console.error('Failed to load sent farmer messages:', error);
        onError?.(error);
      }
    );

    const unsubscribeReceived = onSnapshot(
      receivedQuery,
      snapshot => {
        receivedMessages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        emitMessages();
      },
      error => {
        console.error('Failed to load received farmer messages:', error);
        onError?.(error);
      }
    );

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }

  listenToAllMessages(
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      this.messagesCollection,
      snapshot => {
        const messages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        callback(messages);
      },
      error => {
        console.error('Failed to listen to all messages:', error);
        onError?.(error);
      }
    );
  }

  listenToIncomingStaffMessages(
    staffUid: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const incomingQuery = query(
      this.messagesCollection,
      where('recipientUid', '==', staffUid),
      where('recipientRole', '==', 'staff')
    );

    return onSnapshot(
      incomingQuery,
      snapshot => {
        const messages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        callback(messages);
      },
      error => {
        console.error('Failed to listen to incoming staff messages:', error);
        onError?.(error);
      }
    );
  }

  listenToIncomingPartnerMessages(
    partnerUid: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const incomingQuery = query(
      this.messagesCollection,
      where('recipientUid', '==', partnerUid),
      where('recipientRole', '==', 'partner')
    );

    return onSnapshot(
      incomingQuery,
      snapshot => {
        const messages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        callback(messages);
      },
      error => {
        console.error('Failed to listen to incoming partner messages:', error);
        onError?.(error);
      }
    );
  }

  listenToIncomingFarmerMessages(
    farmerUid: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const incomingQuery = query(
      this.messagesCollection,
      where('recipientUid', '==', farmerUid),
      where('recipientRole', '==', 'farmer')
    );

    return onSnapshot(
      incomingQuery,
      snapshot => {
        const messages = snapshot.docs.map(messageDoc => ({
          id: messageDoc.id,
          ...messageDoc.data()
        })) as ChatMessage[];

        callback(messages);
      },
      error => {
        console.error('Failed to listen to incoming farmer messages:', error);
        onError?.(error);
      }
    );
  }

  async markMessagesAsRead(
    conversationId: string,
    readerUid: string
  ): Promise<void> {
    const unreadQuery = query(
      this.messagesCollection,
      where('conversationId', '==', conversationId),
      where('recipientUid', '==', readerUid),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadQuery);

    const updatePromises = snapshot.docs.map(messageDoc =>
      updateDoc(doc(db, 'messages', messageDoc.id), {
        read: true
      })
    );

    await Promise.all(updatePromises);
  }
}
