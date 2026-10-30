
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ReportType =
  | 'Operational Summary'
  | 'Inventory Movement'
  | 'Farmer Production'
  | 'Delivery Performance';

interface ReportMetric {
  label: string;
  value: string;
  description: string;
  icon: string;
}

interface ReportRow {
  area: string;
  measure: string;
  result: string;
  context: string;
}

interface StockPoint {
  date: string;
  quantity: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports {
  reportType: ReportType = 'Operational Summary';

  reportTypes: ReportType[] = [
    'Operational Summary',
    'Inventory Movement',
    'Farmer Production',
    'Delivery Performance',
  ];

  startDate = '2026-10-01';
  endDate = '2026-10-23';

  generatedAt = new Date();

  // Sample values for interface development only.
  metrics: ReportMetric[] = [
    {
      label: 'Partner Orders Fulfilled',
      value: '2',
      description: '32 kg silk yarn delivered',
      icon: 'package-check',
    },
    {
      label: 'Cocoons Received',
      value: '80 kg',
      description: 'From 2 farmers · 2 fulfilled requests',
      icon: 'layers',
    },
    {
      label: 'Farmer Production',
      value: '16%',
      description: '80 of 500 kg commitments received',
      icon: 'sprout',
    },
    {
      label: 'On-Time Deliveries',
      value: '100%',
      description: '4 of 4 completed movements',
      icon: 'truck',
    },
  ];

  stockPoints: StockPoint[] = [
    { date: '02 Oct', quantity: 32 },
    { date: '09 Oct', quantity: 102 },
    { date: '16 Oct', quantity: 132 },
    { date: '23 Oct', quantity: 120 },
  ];

  reportRows: ReportRow[] = [
    {
      area: 'Partner Fulfillment',
      measure: 'Delivered silk yarn',
      result: '32 kg · 2 orders',
      context: 'ORD-26-007 and ORD-26-008',
    },
    {
      area: 'Silk Yarn Movement',
      measure: 'Opening + received - delivered',
      result: '32 + 120 - 32 = 120 kg',
      context: '72 kg reserved · 48 kg available',
    },
    {
      area: 'Cocoon Movement',
      measure: 'Opening + received - issued',
      result: '200 + 80 - 0 = 280 kg',
      context: '80 kg received for fulfilling requests',
    },
    {
      area: 'Farmer Production',
      measure: 'Received / total commitment',
      result: '80 / 500 kg · 16%',
      context: '420 kg still expected',
    },
    {
      area: 'Delivery Performance',
      measure: 'Completed within scheduled date',
      result: '4 of 4 · 100%',
      context: '2 deliveries and 2 collections completed',
    },
  ];

  get reportSubtitle(): string {
    switch (this.reportType) {
      case 'Inventory Movement':
        return 'Review recorded stock, receipts, allocations, and inventory movement.';
      case 'Farmer Production':
        return 'Monitor cocoon collection and farmer production against commitments.';
      case 'Delivery Performance':
        return 'Review scheduled deliveries and completed movements.';
      default:
        return 'Review fulfillment, stock movement, and farmer production without financial metrics.';
    }
  }

  get filteredRows(): ReportRow[] {
    if (this.reportType === 'Inventory Movement') {
      return this.reportRows.filter(row =>
        ['Silk Yarn Movement', 'Cocoon Movement'].includes(row.area)
      );
    }

    if (this.reportType === 'Farmer Production') {
      return this.reportRows.filter(row =>
        row.area === 'Farmer Production' ||
        row.area === 'Cocoon Movement'
      );
    }

    if (this.reportType === 'Delivery Performance') {
      return this.reportRows.filter(row =>
        row.area === 'Delivery Performance' ||
        row.area === 'Partner Fulfillment'
      );
    }

    return this.reportRows;
  }

  get chartMax(): number {
    return Math.max(160, ...this.stockPoints.map(point => point.quantity));
  }

  get chartCoordinates(): string {
    const width = 460;
    const height = 180;
    const left = 32;
    const top = 14;
    const plotWidth = width - left - 12;
    const plotHeight = height - top - 28;

    return this.stockPoints.map((point, index) => {
      const x = left +
        (this.stockPoints.length > 1
          ? index / (this.stockPoints.length - 1)
          : 0) * plotWidth;

      const y = top +
        (1 - point.quantity / this.chartMax) * plotHeight;

      return `${x},${y}`;
    }).join(' ');
  }

  get chartAreaCoordinates(): string {
    return `32,166 ${this.chartCoordinates} 448,166`;
  }

  get chartYLabels(): number[] {
    const step = this.chartMax / 4;
    return [4, 3, 2, 1, 0].map(value =>
      Math.round(step * value)
    );
  }

  exportReport(): void {
    const header = ['Area', 'Measure', 'Result', 'Operational Context'];

    const rows = this.filteredRows.map(row => [
      row.area,
      row.measure,
      row.result,
      row.context,
    ]);

    const csv = [header, ...rows]
      .map(row =>
        row.map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      )
      .join('\r\n');

    const blob = new Blob(
      ['\uFEFF', csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `PTRI-${this.reportType
      .toLowerCase()
      .replace(/\s+/g, '-')}-${this.startDate}-to-${this.endDate}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }
}
