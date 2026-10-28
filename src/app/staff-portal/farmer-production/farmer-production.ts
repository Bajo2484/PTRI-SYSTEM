import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ProductionCommitment {
  farmer: string;
  reference: string;
  harvestDate: string;
  committed: number;
  received: number;
  remaining: number;
  confirmation: 'Confirmed' | 'Awaiting response';
  lastUpdate: string;
}

@Component({
  selector: 'app-farmers-production',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './farmer-production.html',
  styleUrls: ['./farmer-production.css']
})
export class FarmersProductionComponent {

  searchTerm = '';
  selectedConfirmation = 'all';
  harvestSortAscending = true;
  filtersVisible = false;

  commitments: ProductionCommitment[] = [
    {
      farmer: 'Maria Santos',
      reference: 'PRD-26-031 · Claveria',
      harvestDate: '26 Oct 2028',
      committed: 120,
      received: 40,
      remaining: 80,
      confirmation: 'Confirmed',
      lastUpdate: '23 Oct 2028'
    },
    {
      farmer: 'Jose Cruz',
      reference: 'PRD-26-032 · Balingasag',
      harvestDate: '27 Oct 2028',
      committed: 100,
      received: 40,
      remaining: 60,
      confirmation: 'Confirmed',
      lastUpdate: '22 Oct 2028'
    },
    {
      farmer: 'Elena Dela Cruz',
      reference: 'PRD-26-033 · Claveria',
      harvestDate: '30 Oct 2028',
      committed: 100,
      received: 0,
      remaining: 100,
      confirmation: 'Confirmed',
      lastUpdate: '22 Oct 2028'
    },
    {
      farmer: 'Roberto Flores',
      reference: 'PRD-26-034 · Jasaan',
      harvestDate: '02 Nov 2028',
      committed: 80,
      received: 0,
      remaining: 80,
      confirmation: 'Confirmed',
      lastUpdate: '21 Oct 2028'
    },
    {
      farmer: 'Ana Mendoza',
      reference: 'PRD-26-035 · Mambajao',
      harvestDate: '04 Nov 2028',
      committed: 60,
      received: 0,
      remaining: 60,
      confirmation: 'Awaiting response',
      lastUpdate: '21 Oct 2028'
    },
    {
      farmer: 'Joel Ramos',
      reference: 'PRD-26-036 · Manolo Fortich',
      harvestDate: '06 Nov 2028',
      committed: 40,
      received: 0,
      remaining: 40,
      confirmation: 'Awaiting response',
      lastUpdate: '20 Oct 2028'
    }
  ];

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
            commitment.confirmation === 'Confirmed') ||
          (this.selectedConfirmation === 'awaiting' &&
            commitment.confirmation === 'Awaiting response');

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
