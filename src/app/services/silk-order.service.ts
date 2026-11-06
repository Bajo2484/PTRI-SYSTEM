import { db } from './firebase';
import { Injectable } from '@angular/core';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

export type OrderStatus =
  | 'Pending Review'
  | 'Order Confirmed'
  | 'Preparing Order'
  | 'Packing Completed'
  | 'Ready for Dispatch'
  | 'Dispatched'
  | 'In Transit'
  | 'Delivered'
  | 'Rejected';

export interface OrderStatusHistory {
  status: OrderStatus;
  updatedAt: string;
  remarks?: string;
}

export interface SilkOrder {
  id?: string;
  orderId: string;

  partnerUid: string;
  partnerName: string;
  location: string;

    silkType: string;
  quantity: number;
  deliveryDate: string; // Partner's Requested Delivery Date
  expectedDeliveryDate?: string; // Staff's Expected Delivery Date
  notes?: string;

  status: OrderStatus;

  trackingId?: string;
  qrCode?: string;
  barcode?: string;
  trackingGenerated?: boolean;

  confirmedAt?: string;
  preparingAt?: string;
  packingCompletedAt?: string;
  readyForDispatchAt?: string;
  dispatchedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
   rejectedAt?: string;

  // RECEIVING DETAILS
  receiverName?: string;
  actualQuantityReceived?: number;
  packageCondition?: 'Good' | 'Damaged' | 'Incomplete';
  receivingRemarks?: string;
  receivedAt?: string;
  receiptGenerated?: boolean;

  rejectionReason?: string;
  statusHistory?: OrderStatusHistory[];

  createdAt?: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SilkOrderService {

  private readonly ordersCollection =
    collection(db, 'silk-orders');

  async getPartnerOrders(
    partnerUid: string
  ): Promise<SilkOrder[]> {

    const ordersQuery = query(
      this.ordersCollection,
      where('partnerUid', '==', partnerUid)
    );

    const snapshot = await getDocs(ordersQuery);

    const orders = snapshot.docs.map(orderDoc => ({
      id: orderDoc.id,
      ...orderDoc.data()
    })) as SilkOrder[];

    return orders.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });
  }

listenToPartnerOrders(
  partnerUid: string,
  onUpdate: (orders: SilkOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {

  const ordersQuery = query(
    this.ordersCollection,
    where('partnerUid', '==', partnerUid)
  );

  return onSnapshot(
    ordersQuery,
    snapshot => {
      const orders = snapshot.docs.map(orderDoc => ({
        id: orderDoc.id,
        ...orderDoc.data()
      })) as SilkOrder[];

      orders.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      });

      onUpdate(orders);
    },
    error => {
      onError?.(error);
    }
  );
}

  async getAllOrders(): Promise<SilkOrder[]> {

    const snapshot = await getDocs(
      this.ordersCollection
    );

    return snapshot.docs.map(orderDoc => ({
      id: orderDoc.id,
      ...orderDoc.data()
    })) as SilkOrder[];
  }

  async addOrder(
    order: Omit<SilkOrder, 'id'>
  ): Promise<string> {

    const result = await addDoc(
      this.ordersCollection,
      {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    return result.id;
  }

  async updateOrder(
    orderDocId: string,
    updates: Partial<SilkOrder>
  ): Promise<void> {

    await updateDoc(
      doc(db, 'silk-orders', orderDocId),
      {
        ...updates,
        updatedAt: serverTimestamp()
      }
    );
  }
}
