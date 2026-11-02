import { FormsModule } from '@angular/forms';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import {
  FarmerProductionService,
  FarmerProductionRecord
} from '../../services/farmer-production.service';

interface ProductionCommitment {
  id: string;
  farmer: string;
  farmName: string;
  productionType: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  notes: string;
  reference: string;
  committed: number;
  received: number;
  remaining: number;
  confirmation: 'Reviewed' | 'Pending Review';
  lastUpdate: string;
}
@Component({
  selector: 'app-farmers-production',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './farmer-production.html',
  styleUrls: ['./farmer-production.css']
})
export class FarmersProductionComponent implements OnInit {

  constructor(
    private productionService: FarmerProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  isLoading = true;
  loadError = '';

  get totalCommitted(): number {
  return this.commitments.reduce(
    (total, item) => total + item.committed,
    0
  );
}

get totalReceived(): number {
  return this.commitments.reduce(
    (total, item) => total + item.received,
    0
  );
}

get totalRemaining(): number {
  return this.commitments.reduce(
    (total, item) => total + item.remaining,
    0
  );
}

get awaitingConfirmationCount(): number {
  return this.commitments.filter(
    item => item.confirmation === 'Pending Review'
  ).length;
}

get confirmedTotal(): number {
  return this.commitments
    .filter(item => item.confirmation === 'Reviewed')
    .reduce((total, item) => total + item.remaining, 0);
}

get awaitingTotal(): number {
  return this.commitments
    .filter(item => item.confirmation === 'Pending Review')
    .reduce((total, item) => total + item.remaining, 0);
}

get receivedPercentage(): number {
  return this.totalCommitted > 0
    ? (this.totalReceived / this.totalCommitted) * 100
    : 0;
}
get awaitingFarmers(): ProductionCommitment[] {
  return this.commitments.filter(item => item.confirmation === 'Pending Review');
}

  searchTerm = '';
  selectedConfirmation = 'all';
  harvestSortAscending = true;
  filtersVisible = false;

  commitments: ProductionCommitment[] = [];
  selectedProduction: ProductionCommitment | null = null;
showReviewModal = false;
isReviewing = false;

openReviewModal(commitment: ProductionCommitment): void {
  this.selectedProduction = commitment;
  this.showReviewModal = true;
}

closeReviewModal(): void {
  if (this.isReviewing) return;

  this.showReviewModal = false;
  this.selectedProduction = null;
}

ngOnInit(): void {
  this.loadProductions();
}

async loadProductions(): Promise<void> {
  this.isLoading = true;
  this.loadError = '';

  try {
    const records = await this.productionService.getAllProductions();

    this.commitments = records.map(record => ({
  id: record.id || '',
  farmer: record.farmerName,
  farmName: record.farmName,
  productionType: record.productionType,
  quantity: Number(record.quantity || 0),
  unit: record.unit,
  harvestDate: record.expectedAvailability,
  notes: record.notes || '',
  reference: `PRD-${record.id?.slice(0, 6).toUpperCase() || 'NEW'} · ${record.farmName}`,
      committed: Number(record.quantity || 0),
      received: 0,
      remaining: Number(record.quantity || 0),
      confirmation: record.status === 'Reviewed'
  ? 'Reviewed'
  : 'Pending Review',
      lastUpdate: record.createdAt && typeof (record.createdAt as any).toDate === 'function'
        ? (record.createdAt as any).toDate().toLocaleDateString()
        : ''
    }));

  } catch (error) {
    console.error('Error loading farmer productions:', error);
    this.loadError = 'Unable to load farmer production records. Please try again.';

    await Swal.fire({
      icon: 'error',
      title: 'Unable to Load Production',
      text: this.loadError,
      confirmButtonColor: '#244b38'
    });

  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

async reviewProduction(commitment: ProductionCommitment): Promise<void> {
  if (!commitment.id || commitment.confirmation === 'Reviewed') {
    return;
  }

  this.isReviewing = true;

  try {
    await this.productionService.updateProductionStatus(
      commitment.id,
      'Reviewed'
    );

    const farmerName = commitment.farmer;

    this.showReviewModal = false;
    this.selectedProduction = null;
    this.isReviewing = false;

    await this.loadProductions();

    await Swal.fire({
      icon: 'success',
      title: 'Production Reviewed!',
      text: `${farmerName}'s production submission has been confirmed.`,
      confirmButtonColor: '#244b38'
    });

  } catch (error) {
    console.error('Error reviewing production:', error);

    this.isReviewing = false;

    await Swal.fire({
      icon: 'error',
      title: 'Unable to Review',
      text: 'Something went wrong while updating the production status.',
      confirmButtonColor: '#244b38'
    });
  }
}

  get filteredCommitments(): ProductionCommitment[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.commitments
      .filter(commitment => {
        const matchesSearch =
          commitment.farmer.toLowerCase().includes(search) ||
          commitment.reference.toLowerCase().includes(search);

        const matchesConfirmation =
          this.selectedConfirmation === 'all' ||
          (this.selectedConfirmation === 'confirmed' &&
            commitment.confirmation === 'Reviewed') ||
          (this.selectedConfirmation === 'awaiting' &&
            commitment.confirmation === 'Pending Review');

        return matchesSearch && matchesConfirmation;
      })
      .sort((a, b) => {
        const dateA = new Date(a.harvestDate).getTime();
        const dateB = new Date(b.harvestDate).getTime();

        return this.harvestSortAscending
          ? dateA - dateB
          : dateB - dateA;
      });
  }

  toggleHarvestSort(): void {
    this.harvestSortAscending = !this.harvestSortAscending;
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  openUpdateProduction(): void {
    alert('Update Production: connect this button to your production form.');
  }

  openCommunication(): void {
    alert('Open Communication: connect this button to your communication page.');
  }
}
