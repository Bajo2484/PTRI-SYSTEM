
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import Swal from 'sweetalert2';
import {
  PartnerAccountService
} from '../../services/partner-account.service';

interface PartnerOrder {
  orderNumber: string;
  quantity: number;
  date: string;
  status: 'Pending Review' | 'Confirmed' | 'Scheduled';
}

interface Partner {
  id: string;
  reference: string;
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  locality: string;
  address: string;
  username?: string;
  authUid?: string;
  status: 'Active' | 'Inactive';
  orders: PartnerOrder[];
  activeOrders: number;
  pendingReviews: number;
}

@Component({
  selector: 'app-partner-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './partner-management.html',
  styleUrl: './partner-management.css',
})
export class PartnerManagement implements OnInit {
  constructor(
    private partnerAccountService: PartnerAccountService,
     private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPartners();
  }

  searchTerm = '';
  selectedLocation = 'All';
  selectedStatus = 'All';

  selectedPartner: Partner | null = null;
  showPartnerModal = false;
  editingPartnerId: string | null = null;

  isLoadingPartners = false;
  isSavingPartner = false;

  partners: Partner[] = [];

  partnerForm = this.emptyPartner();

  async loadPartners(showLoading = true): Promise<void> {
  if (showLoading) {
    this.isLoadingPartners = true;

    Swal.fire({
      title: 'Loading Partners',
      text: 'Please wait while we retrieve partner records...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#ffffff',
      color: '#24352b',
      didOpen: () => Swal.showLoading()
    });
  }

  try {
    const records = await this.partnerAccountService.getPartners();

    this.partners = records.map((record, index) => ({
      id: record.id,
      reference: `PTRI-P${String(index + 1).padStart(3, '0')}`,
      organizationName: record.organizationName,
      contactPerson: record.fullName,
      email: record.email,
      phone: record.phone,
      locality: record.locality,
      address: record.address || record.locality,
      username: record.username,
      authUid: record.authUid,
      status: record.status === 'Inactive' ? 'Inactive' : 'Active',
      orders: [],
      activeOrders: 0,
      pendingReviews: 0
    }));

    if (
      this.selectedPartner &&
      !this.partners.some(
        partner => partner.id === this.selectedPartner?.id
      )
    ) {
      this.selectedPartner = null;
    }

    this.cdr.detectChanges();

  } catch (error) {
    console.error('Error loading partners:', error);

    if (showLoading) {
      Swal.close();
    }

    await Swal.fire({
      icon: 'error',
      title: 'Unable to Load Partners',
      text: 'Please check your Firebase connection and permissions.'
    });

  } finally {
    if (showLoading) {
      this.isLoadingPartners = false;
      Swal.close();
    }

    this.cdr.detectChanges();
  }
}

  get locations(): string[] {
    return [
      ...new Set(this.partners.map(partner => partner.locality))
    ].sort();
  }

  get filteredPartners(): Partner[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.partners.filter(partner => {
      const matchesSearch =
        !term ||
        partner.organizationName.toLowerCase().includes(term) ||
        partner.contactPerson.toLowerCase().includes(term) ||
        partner.email.toLowerCase().includes(term);

      const matchesLocation =
        this.selectedLocation === 'All' ||
        partner.locality === this.selectedLocation;

      const matchesStatus =
        this.selectedStatus === 'All' ||
        partner.status === this.selectedStatus;

      return matchesSearch && matchesLocation && matchesStatus;
    });
  }

  get activeOrderPartners(): number {
    return this.partners.filter(
      partner => partner.activeOrders > 0
    ).length;
  }

  get pendingOrderReviews(): number {
    return this.partners.reduce(
      (total, partner) => total + partner.pendingReviews,
      0
    );
  }

  selectPartner(partner: Partner): void {
    this.selectedPartner = partner;
  }

  openAddPartner(): void {
    this.editingPartnerId = null;
    this.partnerForm = this.emptyPartner();
    this.showPartnerModal = true;
  }

  openEditPartner(partner: Partner): void {
    this.editingPartnerId = partner.id;

    this.partnerForm = {
      organizationName: partner.organizationName,
      contactPerson: partner.contactPerson,
      email: partner.email,
      phone: partner.phone,
      locality: partner.locality,
      address: partner.address,
      status: partner.status,
      username: partner.username || '',
      password: ''
    };

    this.showPartnerModal = true;
  }

  closePartnerModal(): void {
    this.showPartnerModal = false;
    this.editingPartnerId = null;
  }

  async savePartner(): Promise<void> {
  const form = this.partnerForm;

  if (
    !form.organizationName.trim() ||
    !form.contactPerson.trim() ||
    !form.email.trim() ||
    !form.phone.trim() ||
    !form.locality.trim() ||
    !form.address.trim()
  ) {
    await Swal.fire({
      icon: 'warning',
      title: 'Missing Information',
      text: 'Please complete all required partner information.'
    });
    return;
  }

  const isEditing = this.editingPartnerId !== null;

  if (!isEditing) {
    if (!form.username.trim() || !form.password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Login Details',
        text: 'Please enter a username and temporary password.'
      });
      return;
    }

    if (form.password.length < 6) {
      await Swal.fire({
        icon: 'warning',
        title: 'Password Too Short',
        text: 'The temporary password must contain at least 6 characters.'
      });
      return;
    }
  }

  if (this.isSavingPartner) return;

  this.isSavingPartner = true;

  Swal.fire({
    title: isEditing ? 'Updating Partner' : 'Creating Partner Account',
    text: 'Please wait while we process your request...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    background: '#ffffff',
    color: '#24352b',
    didOpen: () => Swal.showLoading()
  });

  try {
    if (isEditing && this.editingPartnerId) {
      await this.partnerAccountService.updatePartner(
        this.editingPartnerId,
        {
          fullName: form.contactPerson.trim(),
          organizationName: form.organizationName.trim(),
          locality: form.locality.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          status: form.status
        }
      );
    } else {
      await this.partnerAccountService.createPartnerLogin(
        {
          fullName: form.contactPerson.trim(),
          organizationName: form.organizationName.trim(),
          locality: form.locality.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          username: form.username.trim().toLowerCase(),
          status: form.status
        },
        form.password
      );
    }

    // Refresh partner records without opening another loading alert.
    await this.loadPartners(false);

    this.closePartnerModal();

    Swal.close();

    await Swal.fire({
      icon: 'success',
      title: isEditing ? 'Partner Updated' : 'Partner Account Created',
      text: isEditing
        ? 'Partner information has been updated.'
        : 'The partner login account has been created successfully.'
    });

  } catch (error) {
    console.error(
      isEditing ? 'Error updating partner:' : 'Error creating partner account:',
      error
    );

    Swal.close();

    await Swal.fire({
      icon: 'error',
      title: isEditing ? 'Update Failed' : 'Account Creation Failed',
      text: isEditing
        ? 'Unable to update the partner information.'
        : 'Unable to create the partner account. Please check whether the username already exists and verify Firebase permissions.'
    });

  } finally {
    this.isSavingPartner = false;
    this.cdr.detectChanges();
  }
}

  messagePartner(partner: Partner): void {
    console.log('Selected partner for messaging:', partner.email);
  }

  private emptyPartner(): {
    organizationName: string;
    contactPerson: string;
    email: string;
    phone: string;
    locality: string;
    address: string;
    status: 'Active' | 'Inactive';
    username: string;
    password: string;
  } {
    return {
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      locality: '',
      address: '',
      status: 'Active',
      username: '',
      password: ''
    };
  }
}
