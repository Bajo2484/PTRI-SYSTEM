
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { FarmerAccount, FarmerAccountService } from '../../services/farmer-account.service';

type Farmer = FarmerAccount;

@Component({
  selector: 'app-farmer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-management.html',
  styleUrl: './farmer-management.css',
})
export class FarmerManagement implements OnInit {
 constructor(private farmerAccountService: FarmerAccountService, private cdr: ChangeDetectorRef, private router: Router) {}

  searchTerm = '';
  selectedStatus = 'All Status';
  currentPage = 1;
  pageSize = 5;
  showFarmerModal = false;
  modalMode: 'view' | 'add' | 'edit' = 'view';
  selectedFarmer: Farmer | null = null;
  farmerForm: Omit<Farmer, 'id'> = this.emptyFarmer();
  farmerPassword = '';
  farmers: Farmer[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  ngOnInit(): void {
    void this.loadFarmers();
  }

  async loadFarmers(showLoading = true): Promise<boolean> {
    this.isLoading = true;
    this.errorMessage = '';

    if (showLoading) {
      Swal.fire({
        title: 'Loading Farmer Records',
        text: 'Please wait while we retrieve farmer accounts...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        background: '#fffdf8',
        color: '#493a2c',
        didOpen: () => Swal.showLoading()
      });
    }

    try {
      this.farmers = await this.farmerAccountService.getFarmers();
      this.currentPage = 1;
      this.cdr.detectChanges();
      return true;
    } catch (error) {
      console.error('Error loading farmers:', error);
      this.errorMessage = 'Unable to load farmer records. Please check your connection and permissions.';
      return false;
    } finally {
      this.isLoading = false;
      if (showLoading) Swal.close();
      this.cdr.detectChanges();
    }
  }

  get filteredFarmers(): Farmer[] {
    const search = this.searchTerm.toLowerCase().trim();
    return this.farmers.filter((farmer) => {
      const matchesSearch = !search ||
        farmer.fullName.toLowerCase().includes(search) ||
        farmer.locality.toLowerCase().includes(search) ||
        farmer.phone.toLowerCase().includes(search) ||
        farmer.email.toLowerCase().includes(search) ||
        farmer.farmName.toLowerCase().includes(search);
      const matchesStatus = this.selectedStatus === 'All Status' || farmer.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  get paginatedFarmers(): Farmer[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFarmers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFarmers.length / this.pageSize));
  }

  get totalCommittedSupply(): number {
    return this.farmers.reduce((total, farmer) => total + farmer.supplyCommitment, 0);
  }

  get activeCommitments(): number {
    return this.farmers.filter((farmer) => farmer.status === 'Active')
      .reduce((total, farmer) => total + farmer.supplyCommitment, 0);
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onStatusChange(): void {
    this.currentPage = 1;
  }

  openAddModal(): void {
    this.modalMode = 'add';
    this.farmerForm = this.emptyFarmer();
    this.farmerPassword = '';
    this.selectedFarmer = null;
    this.errorMessage = '';
    this.showFarmerModal = true;
  }

  openViewModal(farmer: Farmer): void {
    this.modalMode = 'view';
    this.selectedFarmer = farmer;
    this.farmerForm = this.toForm(farmer);
    this.errorMessage = '';
    this.showFarmerModal = true;
  }

  openEditModal(farmer: Farmer): void {
    this.modalMode = 'edit';
    this.selectedFarmer = farmer;
    this.farmerForm = this.toForm(farmer);
    this.errorMessage = '';
    this.showFarmerModal = true;
  }

  closeModal(): void {
    this.showFarmerModal = false;
    this.selectedFarmer = null;
    this.farmerPassword = '';
    this.errorMessage = '';
  }

  async saveFarmer(): Promise<void> {
    if (this.isSaving) return;

    const isAdding = this.modalMode === 'add';

    if (isAdding) {
      if (!this.farmerForm.username.trim()) {
        this.errorMessage = 'Please enter a username.';
        return;
      }
      if (this.farmerPassword.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters.';
        return;
      }
    }

    if (!this.farmerForm.fullName.trim() || !this.farmerForm.locality.trim() || !this.farmerForm.phone.trim()) {
      this.errorMessage = 'Please complete the farmer name, phone number, and locality.';
      return;
    }

    if (!Number.isFinite(Number(this.farmerForm.supplyCommitment)) || Number(this.farmerForm.supplyCommitment) < 0) {
      this.errorMessage = 'Supply commitment must be zero or greater.';
      return;
    }

    const data: Omit<Farmer, 'id'> = {
      ...this.farmerForm,
      fullName: this.farmerForm.fullName.trim(),
      locality: this.farmerForm.locality.trim(),
      phone: this.farmerForm.phone.trim(),
      email: this.farmerForm.email.trim(),
      farmName: this.farmerForm.farmName.trim(),
      farmArea: this.farmerForm.farmArea.trim(),
      supplyCommitment: Number(this.farmerForm.supplyCommitment),
    };

    this.isSaving = true;
    this.errorMessage = '';

    Swal.fire({
      title: isAdding ? 'Creating Farmer Account' : 'Updating Farmer Record',
      text: isAdding ? 'Please wait while we save the farmer account...' : 'Please wait while we update the farmer record...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      if (isAdding) {
        await this.farmerAccountService.createFarmerLogin(data, this.farmerPassword);
      } else if (this.modalMode === 'edit' && this.selectedFarmer) {
        await this.farmerAccountService.updateFarmer(this.selectedFarmer.id, data);
      }

      // Refresh records silently without opening another loading popup.
      const refreshed = await this.loadFarmers(false);

      this.closeModal();

      if (refreshed) {
        await Swal.fire({
          icon: 'success',
          title: isAdding ? 'Farmer Added Successfully!' : 'Changes Saved!',
          text: isAdding
            ? 'The new farmer account has been created and added to the farmer records.'
            : 'The farmer record has been successfully updated.',
          confirmButtonText: isAdding ? 'Add Another Farmer' : 'Done',
          showCancelButton: isAdding,
          cancelButtonText: 'Close',
          confirmButtonColor: '#245638',
          cancelButtonColor: '#795033',
          background: '#fffdf8',
          color: '#493a2c',
          reverseButtons: true
        }).then((result) => {
          if (isAdding && result.isConfirmed) this.openAddModal();
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: isAdding ? 'Farmer Account Created!' : 'Changes Saved!',
          text: 'Your changes were saved, but the farmer list could not refresh. Please refresh the records.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#245638',
          background: '#fffdf8',
          color: '#493a2c'
        });
      }
    } catch (error) {
      console.error('Error saving farmer:', error);
      Swal.close();
      this.errorMessage = 'Unable to save the farmer. Please check your Firebase permissions and try again.';
      await Swal.fire({
        icon: 'error',
        title: 'Unable to Save Farmer',
        text: this.errorMessage,
        confirmButtonText: 'OK',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  messageFarmer(farmer: Farmer): void {
  if (!farmer.authUid) {
    Swal.fire({ icon: 'warning', title: 'Unable to Open Conversation', text: 'This farmer does not have a valid account ID.', confirmButtonColor: '#245638', background: '#fffdf8', color: '#493a2c' });
    return;
  }

  void this.router.navigate(['/staff/messages'], {
    queryParams: { recipientUid: farmer.authUid, recipientRole: 'farmer' }
  });
}

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  private emptyFarmer(): Omit<Farmer, 'id'> {
    return {
      fullName: '',
      locality: '',
      phone: '',
      email: '',
      username: '',
      farmName: '',
      farmArea: '',
      supplyCommitment: 0,
      status: 'Pending',
    };
  }

  private toForm(farmer: Farmer): Omit<Farmer, 'id'> {
    const { id, ...data } = farmer;
    return { ...data };
  }
}
