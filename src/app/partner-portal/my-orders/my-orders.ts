import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { auth } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SilkOrderService, type SilkOrder } from '../../services/silk-order.service';
@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css',
})
export class MyOrders implements OnInit {
  constructor(
  private silkOrderService: SilkOrderService,
  private cdr: ChangeDetectorRef
) {}

  orders: SilkOrder[] = [];
  isLoadingOrders = false;

  get totalOrders(): number {
  return this.orders.length;
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

  currentPartnerUid = '';
  currentPartnerName = '';
  currentPartnerLocation = '';

    showOrderModal = false;

  orderForm = {
    silkType: '',
    quantity: 0,
    deliveryDate: '',
    notes: ''
  };

  async ngOnInit(): Promise<void> {
  await this.loadPartnerInfo();
  await this.loadMyOrders();
}

  openOrderModal(): void {
    this.showOrderModal = true;
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
  }

  async submitOrder(): Promise<void> {
  if (
    !this.orderForm.silkType ||
    !this.orderForm.quantity ||
    this.orderForm.quantity <= 0 ||
    !this.orderForm.deliveryDate
  ) {
    alert('Please complete all required order details.');
    return;
  }

  if (!this.currentPartnerUid) {
    alert('Unable to identify your partner account. Please log in again.');
    return;
  }

  try {
    const orderId = `ORD-${Date.now()}`;

    await this.silkOrderService.addOrder({
      orderId,
      partnerUid: this.currentPartnerUid,
      partnerName: this.currentPartnerName,
      location: this.currentPartnerLocation,
      silkType: this.orderForm.silkType,
      quantity: this.orderForm.quantity,
      deliveryDate: this.orderForm.deliveryDate,
      notes: this.orderForm.notes.trim(),
      status: 'Pending Review'
    });

    await this.loadMyOrders();

await Swal.fire({
  icon: 'success',
  title: 'Order Submitted!',
  text: 'Your silk supply request has been submitted successfully.',
  confirmButtonText: 'Great!',
  confirmButtonColor: '#244b38',
  background: '#ffffff',
  color: '#244b38'
});

    this.orderForm = {
      silkType: '',
      quantity: 0,
      deliveryDate: '',
      notes: ''
    };

    this.closeOrderModal();

  } catch (error) {
  console.error('Order submission failed:', error);

  await Swal.fire({
    icon: 'error',
    title: 'Submission Failed',
    text: 'Unable to submit your order. Please try again.',
    confirmButtonText: 'Okay',
    confirmButtonColor: '#244b38'
  });
}
}

    async loadPartnerInfo(): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    console.error('No authenticated partner found.');
    return;
  }

  this.currentPartnerUid = user.uid;

  try {
    const partnerQuery = query(
      collection(db, 'partners'),
      where('authUid', '==', user.uid)
    );

    const snapshot = await getDocs(partnerQuery);

    if (snapshot.empty) {
      console.error('Partner profile not found.');
      return;
    }

    const partnerData = snapshot.docs[0].data();

    this.currentPartnerName =
      partnerData['organizationName'] || partnerData['fullName'] || '';

    this.currentPartnerLocation =
      partnerData['locality'] || partnerData['address'] || '';

    console.log('Partner Name:', this.currentPartnerName);
    console.log('Partner Location:', this.currentPartnerLocation);

  } catch (error) {
    console.error('Unable to load partner information:', error);
  }
}

async loadMyOrders(): Promise<void> {
  if (!this.currentPartnerUid) {
    return;
  }

  this.isLoadingOrders = true;

  try {
    this.orders = await this.silkOrderService.getPartnerOrders(
      this.currentPartnerUid
    );
  } catch (error) {
    console.error('Unable to load partner orders:', error);
  } finally {
    this.isLoadingOrders = false;
  }
}
}