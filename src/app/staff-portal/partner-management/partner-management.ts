
import { Component, OnInit } from '@angular/core';
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
    private partnerAccountService: PartnerAccountService
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

  partners: Partner[] = [];

  partnerForm = this.emptyPartner();

  async loadPartners(): Promise<void> {
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
    } catch (error) {
      console.error('Error loading partners:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Partners',
        text: 'Please check your Firebase connection and permissions.'
      });
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

    if (this.editingPartnerId !== null) {
      try {
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

        await this.loadPartners();

        await Swal.fire({
          icon: 'success',
          title: 'Partner Updated',
          text: 'Partner information has been updated.'
        });

        this.closePartnerModal();
      } catch (error) {
        console.error('Error updating partner:', error);

        await Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Unable to update the partner information.'
        });
      }

      return;
    }

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

    try {
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

      await this.loadPartners();

      await Swal.fire({
        icon: 'success',
        title: 'Partner Account Created',
        text: 'The partner login account has been created successfully.'
      });

      this.closePartnerModal();
    } catch (error) {
      console.error('Error creating partner account:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Account Creation Failed',
        text: 'Unable to create the partner account. Please check whether the username already exists and verify Firebase permissions.'
      });
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
