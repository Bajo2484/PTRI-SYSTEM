
import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Plus,
  Users,
  User,
  UserRound,
  Search,
  X,
  ListFilter,
  MapPin,
  Phone,
  Mail,
  Eye,
  Pencil,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Sprout,
  Map,
  Leaf,
  Camera,
  Trash2,
  AlertCircle,
  LoaderCircle,
  Save
} from 'lucide-angular';
import { FarmerAccount, FarmerAccountService } from '../../services/farmer-account.service';

type Farmer = FarmerAccount;

@Component({
  selector: 'app-farmer-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './farmer-management.html',
  styleUrl: './farmer-management.css',
})
export class FarmerManagement implements OnInit {
  constructor(
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

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

  // LOAD FARMER RECORDS
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

  // SEARCH AND FILTER
  get filteredFarmers(): Farmer[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.farmers.filter((farmer) => {
      const matchesSearch = !search ||
        farmer.fullName.toLowerCase().includes(search) ||
        farmer.locality.toLowerCase().includes(search) ||
        farmer.phone.toLowerCase().includes(search) ||
        farmer.email.toLowerCase().includes(search) ||
        farmer.farmName.toLowerCase().includes(search) ||
        farmer.communityName?.toLowerCase().includes(search) ||
        farmer.bio?.toLowerCase().includes(search) ||
        farmer.farmingExperience?.toLowerCase().includes(search) ||
        farmer.farmingPractices?.toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'All Status' ||
        farmer.status === this.selectedStatus;

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

  get totalFarmers(): number {
    return this.farmers.length;
  }

  get activeFarmers(): number {
    return this.farmers.filter(farmer => farmer.status === 'Active').length;
  }

  get individualFarmers(): number {
    return this.farmers.filter(farmer => farmer.farmerType === 'Individual').length;
  }

  get communityFarmers(): number {
    return this.farmers.filter(farmer => farmer.farmerType === 'Community').length;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onStatusChange(): void {
    this.currentPage = 1;
  }

  // PROFILE PICTURE
  async onProfilePictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Image must not exceed 5 MB before compression.';
      input.value = '';
      return;
    }

    try {
      const compressedImage = await this.compressImage(file);
      this.farmerForm.profilePicture = compressedImage;
      this.errorMessage = '';
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error processing profile picture:', error);
      this.errorMessage = 'Unable to process this image. Please choose another photo.';
    } finally {
      input.value = '';
    }
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Unable to read image.'));

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error('Invalid image.'));

        image.onload = () => {
          const maxDimension = 400;
          const scale = Math.min(
            1,
            maxDimension / Math.max(image.width, image.height)
          );

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const context = canvas.getContext('2d');

          if (!context) {
            reject(new Error('Canvas is not supported.'));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          let quality = 0.75;
          let base64 = canvas.toDataURL('image/jpeg', quality);

          while (base64.length > 180000 && quality > 0.35) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }

          if (base64.length > 180000) {
            reject(new Error('Image is still too large after compression.'));
            return;
          }

          resolve(base64);
        };

        image.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  removeProfilePicture(): void {
    this.farmerForm.profilePicture = '';
  }

  // MODAL
  openAddModal(): void {
    this.modalMode = 'add';
    this.farmerForm = this.emptyFarmer();
    this.farmerPassword = '';
    this.selectedFarmer = null;
    this.errorMessage = '';
    this.showFarmerModal = true;
  }

  // VIEW FARMER - FETCH LATEST COMPLETE INFORMATION
  async openViewModal(farmer: Farmer): Promise<void> {
    if (Swal.isVisible()) return;

    this.showFarmerModal = false;
    this.errorMessage = '';

    Swal.fire({
      title: 'Loading Farmer Information',
      text: 'Please wait while we retrieve the complete farmer details...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#fffdf8',
      color: '#493a2c',
      didOpen: () => Swal.showLoading()
    });

    try {
      const latestFarmer =
        await this.farmerAccountService.getFarmerById(farmer.id);

      this.selectedFarmer = latestFarmer;
      this.farmerForm = this.toForm(latestFarmer);
      this.modalMode = 'view';
      this.errorMessage = '';

      this.cdr.detectChanges();

      Swal.close();

      this.showFarmerModal = true;
      this.cdr.detectChanges();

    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
        message?: string;
      };

      console.error('FIRESTORE FARMER FETCH ERROR:', error);
      console.error('Farmer ID:', farmer.id);
      console.error('Firebase Error Code:', firebaseError?.code);
      console.error('Firebase Error Message:', firebaseError?.message);

      Swal.close();

      await Swal.fire({
        icon: 'error',
        title: 'Unable to Load Farmer Information',
        html: `
          <p>${firebaseError?.code || 'Unknown Error'}</p>
          <small>${firebaseError?.message || 'No additional error details available.'}</small>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });

      this.cdr.detectChanges();
    }
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

  // SAVE FARMER
  async saveFarmer(): Promise<void> {
    if (this.isSaving) return;

    const isAdding = this.modalMode === 'add';

    if (isAdding && !this.farmerForm.profilePicture) {
      this.errorMessage = 'Please upload the farmer profile picture.';
      return;
    }

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

    if (
      !this.farmerForm.fullName.trim() ||
      !this.farmerForm.locality.trim() ||
      !this.farmerForm.phone.trim()
    ) {
      this.errorMessage = 'Please complete the farmer name, phone number, and locality.';
      return;
    }

    if (
      !Number.isFinite(Number(this.farmerForm.mulberryTreeCount)) ||
      Number(this.farmerForm.mulberryTreeCount) < 0
    ) {
      this.errorMessage = 'Mulberry tree count must be zero or greater.';
      return;
    }

    if (
      this.farmerForm.farmerType === 'Community' &&
      (
        !this.farmerForm.communityName?.trim() ||
        !Number.isFinite(Number(this.farmerForm.memberCount)) ||
        Number(this.farmerForm.memberCount) < 1
      )
    ) {
      this.errorMessage = 'Please provide the community name and a valid member count.';
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
      farmerType: this.farmerForm.farmerType || 'Individual',
      mulberryTreeCount: Number(this.farmerForm.mulberryTreeCount || 0),
      communityName: this.farmerForm.communityName?.trim() || '',
      memberCount: Number(this.farmerForm.memberCount || 0),
      profilePicture: this.farmerForm.profilePicture || ''
    };

    this.isSaving = true;
    this.errorMessage = '';

    Swal.fire({
      title: isAdding ? 'Creating Farmer Account' : 'Updating Farmer Record',
      text: isAdding
        ? 'Please wait while we save the farmer account...'
        : 'Please wait while we update the farmer record...',
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

  // MESSAGE FARMER
  messageFarmer(farmer: Farmer): void {
    if (!farmer.authUid) {
      Swal.fire({
        icon: 'warning',
        title: 'Unable to Open Conversation',
        text: 'This farmer does not have a valid account ID.',
        confirmButtonColor: '#245638',
        background: '#fffdf8',
        color: '#493a2c'
      });
      return;
    }

    void this.router.navigate(['/staff/messages'], {
      queryParams: {
        recipientUid: farmer.authUid,
        recipientRole: 'farmer'
      }
    });
  }

  // PAGINATION
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // DEFAULT FARMER DATA
  private emptyFarmer(): Omit<Farmer, 'id'> {
    return {
      fullName: '',
      locality: '',
      phone: '',
      email: '',
      username: '',
      farmerType: 'Individual',
      farmName: '',
      communityName: '',
      memberCount: 0,
      farmArea: '',
      mulberryTreeCount: 0,
      status: 'Pending',
      profilePicture: ''
    };
  }

  // CONVERT FARMER RECORD TO FORM
  private toForm(farmer: Farmer): Omit<Farmer, 'id'> {
    const { id, ...data } = farmer;

    return {
      ...data,
      farmerType: farmer.farmerType || 'Individual',
      communityName: farmer.communityName || '',
      memberCount: farmer.memberCount || 0,
      mulberryTreeCount: farmer.mulberryTreeCount || 0,
      profilePicture: farmer.profilePicture || ''
    };
  }
}
