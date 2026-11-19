
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';

import {
  LucideAngularModule,
  Bug,
  Package,
  Activity,
  Sprout,
  CheckCircle,
  Info,
  ChevronRight,
  PackageOpen,
  X,
  Clock,
} from 'lucide-angular';

import {
  SilkwormProductionService,
  SilkwormBatch,
  SilkwormStatus,
  SilkwormStage,
  CocoonHarvestRecord,
} from '../../services/silkworm-production.service';

@Component({
  selector: 'app-silkworm-cocoon-production',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LucideAngularModule,
    QRCodeComponent,
  ],
  templateUrl: './silkworm-cocoon-production.html',
  styleUrl: './silkworm-cocoon-production.css',
})
export class SilkwormCocoonProduction implements OnInit {

  // PAGE STATE
  activeTab = 'all';
  selectedBatch: SilkwormBatch | null = null;
  showDetailsModal = false;

  // FORM STATES
  showHarvestModal = false;
  showReturnModal = false;

  // PRODUCTION RECORDS
  batches: SilkwormBatch[] = [];

  // QR CODE SETTINGS
  readonly qrCodeWidth = 190;
  readonly qrCodeErrorCorrectionLevel = 'M';

  // REARING UPDATE
  selectedStage: SilkwormStage = '1st Instar';
  rearingRemarks = '';

  readonly stageOptions: SilkwormStage[] = [
    '1st Instar',
    '2nd Instar',
    '3rd Instar',
    '4th Instar',
    '5th Instar',
  ];

  // HARVEST FORM
  harvestDate = this.getToday();
  harvestedWeight: number | null = null;
  cocoonQuantity: number | null = null;
  cocoonCondition = 'Good';
  harvestRemarks = '';
  expectedReturnDate = '';

  // RETURN FORM
  returnDate = this.getToday();

  // LUCIDE ICONS
  readonly icons = {
    Bug,
    Package,
    Activity,
    Sprout,
    CheckCircle,
    Info,
    ChevronRight,
    PackageOpen,
    X,
    Clock,
  };

  constructor(
    private silkwormService: SilkwormProductionService
  ) {}

  ngOnInit(): void {
    this.loadBatches();
  }

  // LOAD BATCHES
  loadBatches(): void {
    this.batches = this.silkwormService.getAllBatches();
  }

  // SUMMARY COUNTS
  get totalBatches(): number {
    return this.batches.length;
  }

  get activeRearing(): number {
    return this.batches.filter(
      batch => batch.status === 'In Rearing'
    ).length;
  }

  get readyForHarvest(): number {
    return this.batches.filter(
      batch => batch.status === 'Ready for Harvest'
    ).length;
  }

  get returnedBatches(): number {
    return this.batches.filter(
      batch => batch.status === 'Returned to PTRI'
    ).length;
  }

  // FILTER BATCHES
  get filteredBatches(): SilkwormBatch[] {
    if (this.activeTab === 'all') {
      return this.batches;
    }

    return this.batches.filter(
      batch => batch.status === this.activeTab
    );
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // OPEN BATCH DETAILS
  openBatchDetails(batch: SilkwormBatch): void {
    this.selectedBatch = batch;
    this.selectedStage = batch.currentStage;
    this.showDetailsModal = true;
  }

  closeBatchDetails(): void {
    this.showDetailsModal = false;
    this.selectedBatch = null;
  }

  // START REARING
  startRearing(batch: SilkwormBatch): void {
    const success = this.silkwormService.startRearing(batch.id);

    if (success) {
      this.loadBatches();
      this.selectedBatch =
        this.silkwormService.getBatchById(batch.id) ?? null;
    }
  }

  // UPDATE INSTAR STAGE
  updateStage(batch: SilkwormBatch): void {
    if (!this.selectedStage) {
      return;
    }

    const success = this.silkwormService.updateRearingProgress(
      batch.id,
      this.selectedStage,
      this.rearingRemarks
    );

    if (success) {
      this.rearingRemarks = '';
      this.loadBatches();
      this.selectedBatch =
        this.silkwormService.getBatchById(batch.id) ?? null;
    }
  }

  // MARK BATCH READY FOR HARVEST
  markReadyForHarvest(batch: SilkwormBatch): void {
    const success = this.silkwormService.markReadyForHarvest(
      batch.id,
      'Farmer marked this batch as ready for cocoon harvest.'
    );

    if (success) {
      this.loadBatches();
      this.selectedBatch =
        this.silkwormService.getBatchById(batch.id) ?? null;
    }
  }

  // OPEN HARVEST FORM
  openHarvestForm(batch: SilkwormBatch): void {
    this.selectedBatch = batch;
    this.harvestDate = this.getToday();
    this.harvestedWeight = null;
    this.cocoonQuantity = null;
    this.cocoonCondition = 'Good';
    this.harvestRemarks = '';
    this.expectedReturnDate = '';
    this.showHarvestModal = true;
  }

  closeHarvestForm(): void {
    this.showHarvestModal = false;
  }

  // SUBMIT COCOON HARVEST
  submitHarvest(): void {
    if (
      !this.selectedBatch ||
      !this.harvestDate ||
      !this.harvestedWeight ||
      this.harvestedWeight <= 0 ||
      !this.cocoonCondition
    ) {
      return;
    }

    const batchId = this.selectedBatch.id;

    const record = this.silkwormService.submitCocoonHarvest(
      batchId,
      {
        harvestDate: this.harvestDate,
        harvestedWeight: Number(this.harvestedWeight),
        cocoonQuantity: this.cocoonQuantity
          ? Number(this.cocoonQuantity)
          : undefined,
        cocoonCondition: this.cocoonCondition,
        remarks: this.harvestRemarks,
        expectedReturnDate: this.expectedReturnDate || undefined,
      }
    );

    if (record) {
      this.showHarvestModal = false;
      this.loadBatches();

      this.selectedBatch =
        this.silkwormService.getBatchById(batchId) ?? null;
    }
  }

  // GET COCOON RECORD LINKED TO A BATCH
  getCocoonRecord(batchId: string): CocoonHarvestRecord | undefined {
    return this.silkwormService
      .getAllCocoonRecords()
      .find(record => record.silkwormBatchId === batchId);
  }

  // OPEN RETURN FORM
  openReturnForm(batch: SilkwormBatch): void {
    this.selectedBatch = batch;
    this.returnDate = this.getToday();
    this.showReturnModal = true;
  }

  closeReturnForm(): void {
    this.showReturnModal = false;
  }

  // SUBMIT COCOON RETURN
  submitReturn(): void {
    if (!this.selectedBatch || !this.returnDate) {
      return;
    }

    const batchId = this.selectedBatch.id;

    const cocoonRecord = this.getCocoonRecord(batchId);

    if (!cocoonRecord) {
      return;
    }

    const success = this.silkwormService.submitCocoonReturn(
      cocoonRecord.id,
      this.returnDate
    );

    if (success) {
      this.showReturnModal = false;
      this.loadBatches();

      this.selectedBatch =
        this.silkwormService.getBatchById(batchId) ?? null;
    }
  }

  // STATUS STYLE
  getStatusClass(status: SilkwormStatus): string {
    switch (status) {
      case 'Received':
        return 'status-received';

      case 'In Rearing':
        return 'status-rearing';

      case 'Ready for Harvest':
        return 'status-harvest';

      case 'Harvested':
        return 'status-harvested';

      case 'Return Submitted':
        return 'status-harvested';

      case 'Returned to PTRI':
        return 'status-returned';

      default:
        return '';
    }
  }

  // HARVEST FORM INPUT HANDLERS
  onHarvestWeightChange(value: string): void {
    this.harvestedWeight = value ? Number(value) : null;
  }

  onCocoonQuantityChange(value: string): void {
    this.cocoonQuantity = value ? Number(value) : null;
  }

  // GET LOCAL CURRENT DATE
  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
