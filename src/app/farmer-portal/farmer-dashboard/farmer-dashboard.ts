import { RouterModule } from '@angular/router';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  UserRound,
  Sprout,
  ClipboardList,
    Package,
  CheckCircle2,
  Clock3,
  Plus,
  ArrowRight,
  ChevronRight
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
  selector: 'app-farmer-dashboard',
  standalone: true,
 imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './farmer-dashboard.html',
  styleUrl: './farmer-dashboard.css',
})
export class FarmerDashboard implements OnInit {

  readonly UserRound = UserRound;
  readonly Sprout = Sprout;
  readonly ClipboardList = ClipboardList;
readonly Package = Package;
readonly CheckCircle2 = CheckCircle2;
readonly Clock3 = Clock3;
  readonly Plus = Plus;
  readonly ArrowRight = ArrowRight;
  readonly ChevronRight = ChevronRight;

  farmerProfile: FarmerAccount | null = null;
  productions: FarmerProductionRecord[] = [];

  isLoading = true;
  loadError = '';
  today = new Date();

  constructor(
    private productionService: FarmerProductionService,
    private farmerAccountService: FarmerAccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        this.loadError = 'Please log in to view your dashboard.';
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
      console.error('Error loading farmer dashboard:', error);
      this.loadError = 'Unable to load dashboard data. Please try again.';
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

  get reviewedCount(): number {
    return this.productions.filter(
      record => record.status === 'Reviewed'
    ).length;
  }

  get latestProduction(): FarmerProductionRecord | null {
    return this.productions.length ? this.productions[0] : null;
  }
}
