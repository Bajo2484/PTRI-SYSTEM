import Swal from 'sweetalert2';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import {
  Sprout,
  ClipboardList,
  Clock3,
  Plus,
  Leaf,
  Info,
  CalendarDays,
  Package,
  CheckCircle2,
  Eye
} from 'lucide-angular';

import { getAuth } from 'firebase/auth';

import {
  FarmerProductionService,
  FarmerProductionRecord
} from '../../services/farmer-production.service';

import {
  FarmerAccountService,
  FarmerAccount
} from '../../services/farmer-account.service';

@Component({
  selector: 'app-farmer-production',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './farmer-production.html',
  styleUrl: './farmer-production.css',
})
export class FarmerProduction implements OnInit {

  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
  readonly Clock3 = Clock3;
  readonly Plus = Plus;
  readonly Leaf = Leaf;
  readonly Info = Info;
  readonly CalendarDays = CalendarDays;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly Eye = Eye;

  productions: FarmerProductionRecord[] = [];
  farmerProfile: FarmerAccount | null = null;

  isLoading = true;
  isSaving = false;
  loadError = '';
  formError = '';

  showProductionForm = false;

  productionType = '';
  quantity: number | null = null;
  unit = 'kg';
  expectedAvailability = '';
  notes = '';

  constructor(
    private productionService: FarmerProductionService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProductions();
  }

  async loadProductions(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        this.loadError = 'Please log in to view your production records.';
        return;
      }

      const farmers = await this.farmerAccountService.getFarmers();

      this.farmerProfile =
        farmers.find(farmer => farmer.authUid === currentUser.uid) || null;

      if (!this.farmerProfile) {
        this.loadError = 'Your farmer account could not be found.';
        return;
      }

      this.productions =
        await this.productionService.getFarmerProductions(currentUser.uid);

    } catch (error) {
      console.error('Error loading farmer production:', error);
      this.loadError = 'Unable to load production records. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get totalProduction(): number {
    return this.productions.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );
  }

  get totalRecords(): number {
    return this.productions.length;
  }

  get pendingReviewCount(): number {
    return this.productions.filter(
      record => record.status === 'Pending Review'
    ).length;
  }

  openProductionForm(): void {
    this.formError = '';
    this.showProductionForm = true;
  }

  closeProductionForm(): void {
    if (this.isSaving) {
      return;
    }

    this.showProductionForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.productionType = '';
    this.quantity = null;
    this.unit = 'kg';
    this.expectedAvailability = '';
    this.notes = '';
    this.formError = '';
  }

  async saveProduction(): Promise<void> {
  if (!this.productionType.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Production Type Required',
      text: 'Please enter your production type.',
      confirmButtonColor: '#477451'
    });
    return;
  }

  if (
    this.quantity === null ||
    !Number.isFinite(this.quantity) ||
    this.quantity <= 0
  ) {
    Swal.fire({
      icon: 'warning',
      title: 'Invalid Quantity',
      text: 'Please enter a valid production quantity.',
      confirmButtonColor: '#477451'
    });
    return;
  }

  if (!this.expectedAvailability) {
    Swal.fire({
      icon: 'warning',
      title: 'Date Required',
      text: 'Please select your expected availability date.',
      confirmButtonColor: '#477451'
    });
    return;
  }
    const currentUser = getAuth().currentUser;

    if (!currentUser || !this.farmerProfile) {
      this.formError = 'Your farmer account could not be verified.';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    Swal.fire({
  title: 'Saving Production...',
  text: 'Please wait while we save your production record.',
  allowOutsideClick: false,
  allowEscapeKey: false,
  showConfirmButton: false,
  didOpen: () => {
    Swal.showLoading();
  },
  background: '#ffffff',
  color: '#2d4334'
});

    try {
      await this.productionService.addProduction({
        farmerUid: currentUser.uid,
        farmerName: this.farmerProfile.fullName,
        farmName: this.farmerProfile.farmName,
        productionType: this.productionType.trim(),
        quantity: this.quantity,
        unit: this.unit,
        expectedAvailability: this.expectedAvailability,
        notes: this.notes.trim(),
        status: 'Pending Review'
      });

      this.showProductionForm = false;
this.resetForm();

await this.loadProductions();

Swal.close();

await Swal.fire({
  icon: 'success',
  title: 'Production Submitted!',
  text: 'Your production record has been saved successfully.',
  confirmButtonText: 'Great!',
  confirmButtonColor: '#477451',
  background: '#ffffff',
  color: '#2d4334',
  timer: 2500,
  timerProgressBar: true
});

    } catch (error) {
  console.error('Error saving production:', error);

  Swal.close();

  await Swal.fire({
    icon: 'error',
    title: 'Unable to Save',
    text: 'Something went wrong while saving your production. Please try again.',
    confirmButtonText: 'Try Again',
    confirmButtonColor: '#477451',
    background: '#ffffff',
    color: '#2d4334'
  });
} finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }
}
