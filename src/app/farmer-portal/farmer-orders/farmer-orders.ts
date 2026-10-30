
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import {
  Package,
  Clock3,
  ArrowRight,
  Leaf,
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  Boxes,
  Truck,
  X
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-orders',
  imports: [
    CommonModule,
    LucideAngularModule
  ],
  templateUrl: './farmer-orders.html',
  styleUrl: './farmer-orders.css',
})
export class FarmerOrders {

  showRequestModal = false;
  showConfirmationModal = false;

  selectedRequest: any = null;
  selectedResponse = '';

  availableQuantity: number | null = null;
  responseRemarks = '';
  responseReason = '';

  submittedResponses: { [key: string]: any } = {};

  readonly Package = Package;
  readonly Clock3 = Clock3;
  readonly ArrowRight = ArrowRight;
  readonly Leaf = Leaf;
  readonly CheckCircle2 = CheckCircle2;
  readonly CalendarDays = CalendarDays;
  readonly ClipboardList = ClipboardList;
  readonly Boxes = Boxes;
  readonly Truck = Truck;
  readonly X = X;

  openRequest(request: any) {
    this.selectedRequest = request;
    this.showRequestModal = true;

    const savedResponse = this.submittedResponses[request.id];

    if (savedResponse) {
      this.selectedResponse = savedResponse.response;
      this.availableQuantity = savedResponse.availableQuantity;
      this.responseRemarks = savedResponse.remarks;
      this.responseReason = savedResponse.reason;
    } else {
      this.selectedResponse = '';
      this.availableQuantity = null;
      this.responseRemarks = '';
      this.responseReason = '';
    }
  }

  closeRequest() {
    this.showConfirmationModal = false;
    this.showRequestModal = false;
    this.selectedRequest = null;

    this.selectedResponse = '';
    this.availableQuantity = null;
    this.responseRemarks = '';
    this.responseReason = '';
  }

  selectResponse(response: string) {
    this.selectedResponse = response;

    this.availableQuantity = null;
    this.responseRemarks = '';
    this.responseReason = '';
  }

  confirmResponse() {
    if (!this.selectedRequest || !this.selectedResponse) {
      return;
    }

    this.submittedResponses[this.selectedRequest.id] = {
      response: this.selectedResponse,
      availableQuantity: this.availableQuantity,
      remarks: this.responseRemarks,
      reason: this.responseReason,
      status: 'Response Submitted',
      submittedAt: new Date()
    };

    this.showConfirmationModal = false;
    this.showRequestModal = false;
    this.selectedRequest = null;
  }

  hasSubmittedResponse(requestId: string): boolean {
    return !!this.submittedResponses[requestId];
  }

  viewResponse(request: any) {
    this.openRequest(request);
  }

}
