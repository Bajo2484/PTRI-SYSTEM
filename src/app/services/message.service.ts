import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  Unsubscribe
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
      createdAt: serverTimestamp(),
      read: false
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
}