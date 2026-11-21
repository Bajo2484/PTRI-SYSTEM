
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  LucideAngularModule,
  Bug,
  PackageCheck,
  ClipboardList,
  ArrowRight,
  Activity,
} from 'lucide-angular';

import { SilkwormProductionService } from '../../services/silkworm-production.service';

@Component({
  selector: 'app-silkworm-cocoon-production',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
  ],
  templateUrl: './silkworm-cocoon-production.html',
  styleUrl: './silkworm-cocoon-production.css',
})
export class SilkwormCocoonProduction {

  // LUCIDE ICONS
  readonly icons = {
    Bug,
    PackageCheck,
    ClipboardList,
    ArrowRight,
    Activity,
  };

  constructor(
    private silkwormService: SilkwormProductionService,
    private router: Router
  ) {}

  // SUMMARY COUNTS
  get totalRequests(): number {
    // Will use the silkworm request service
    // once the request feature is implemented.
    return 0;
  }

  get activeBatches(): number {
    return this.silkwormService.getAllBatches().filter(
      batch => batch.status === 'In Rearing'
    ).length;
  }

  get cocoonReturns(): number {
    return this.silkwormService.getAllCocoonRecords().filter(
      record => record.returnStatus === 'Returned to PTRI'
    ).length;
  }

  // OPEN FEATURE MODULES
  openSilkwormRequests(): void {
    this.router.navigate([
      '/farmer/silkworm-requests-batches'
    ]);
  }

  openCocoonProduction(): void {
    this.router.navigate([
      '/farmer/cocoon-production'
    ]);
  }
}
