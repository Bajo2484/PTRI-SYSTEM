
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SilkOrderService, SilkOrder } from '../../services/silk-order.service';
import { FarmerProductionService, FarmerProductionRecord } from '../../services/farmer-production.service';

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
export class Reports implements OnInit {
  reportType: ReportType = 'Operational Summary';

  reportTypes: ReportType[] = [
    'Operational Summary',
    'Inventory Movement',
    'Farmer Production',
    'Delivery Performance',
  ];

  startDate = '2026-01-01';
  endDate = '2026-11-07';
  generatedAt = new Date();

  // Firebase report data
  allOrders: SilkOrder[] = [];
  allProductions: FarmerProductionRecord[] = [];
  isLoading = true;

  // Monthly Order Trend
  stockPoints: StockPoint[] = [];

  // Cocoon Commitment Progress
  receivedQuantity = 0;
  confirmedExpectedQuantity = 0;
  awaitingConfirmationQuantity = 0;
  totalExpectedQuantity = 0;
  productionUnit = 'kg';

  // Dynamic report data
  metrics: ReportMetric[] = [];
  reportRows: ReportRow[] = [];

  // PDF layout cursor
  private pdfNextTableY = 38;

  // PDF theme colors: Green, Gold, Brown, and Ivory
  private readonly pdfGreen: [number, number, number] = [36, 86, 56];
  private readonly pdfDarkGreen: [number, number, number] = [24, 63, 42];
  private readonly pdfGold: [number, number, number] = [198, 160, 68];
  private readonly pdfBrown: [number, number, number] = [121, 80, 51];
  private readonly pdfIvory: [number, number, number] = [248, 246, 239];
  private readonly pdfLightGreen: [number, number, number] = [235, 242, 233];
  private readonly pdfText: [number, number, number] = [55, 53, 45];
  private readonly pdfMuted: [number, number, number] = [112, 106, 94];

  get receivedPercent(): number {
    return 0;
  }

  get confirmedExpectedPercent(): number {
    return this.totalExpectedQuantity
      ? Math.round((this.confirmedExpectedQuantity / this.totalExpectedQuantity) * 100)
      : 0;
  }

  get awaitingConfirmationPercent(): number {
    return this.totalExpectedQuantity
      ? Math.round((this.awaitingConfirmationQuantity / this.totalExpectedQuantity) * 100)
      : 0;
  }

  constructor(
    private silkOrderService: SilkOrderService,
    private farmerProductionService: FarmerProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReportData();
  }

  async loadReportData(): Promise<void> {
    this.isLoading = true;

    try {
      const [orders, productions] = await Promise.all([
        this.silkOrderService.getAllOrders(),
        this.farmerProductionService.getAllProductions(),
      ]);

      this.allOrders = orders;
      this.allProductions = productions;

      this.generateMonthlyOrderTrend();
      this.calculateCocoonCommitmentProgress();
      this.generateSummaryMetrics();
      this.generateReportRows();

      this.generatedAt = new Date();
    } catch (error) {
      console.error('Error loading Reports data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private getDateValue(value: any): Date | null {
    if (!value) return null;

    let date: Date;

    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isWithinDateRange(value: any): boolean {
    const date = this.getDateValue(value);
    if (!date) return false;

    const start = new Date(`${this.startDate}T00:00:00`);
    const end = new Date(`${this.endDate}T23:59:59.999`);

    return date >= start && date <= end;
  }

  private getOrdersByCreatedDate(): SilkOrder[] {
    return this.allOrders.filter(order =>
      this.isWithinDateRange(order.createdAt)
    );
  }

  private getProductionsByCreatedDate(): FarmerProductionRecord[] {
    return this.allProductions.filter(record =>
      this.isWithinDateRange(record.createdAt)
    );
  }

  generateMonthlyOrderTrend(): void {
    const start = new Date(`${this.startDate}T00:00:00`);
    const end = new Date(`${this.endDate}T23:59:59`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      this.stockPoints = [];
      return;
    }

    const monthlyCounts = new Map<string, number>();

    const currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (currentMonth <= lastMonth) {
      const key = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts.set(key, 0);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    this.allOrders.forEach(order => {
      const orderDate = this.getDateValue(order.createdAt);

      if (!orderDate || orderDate < start || orderDate > end) return;

      const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyCounts.has(key)) {
        monthlyCounts.set(key, (monthlyCounts.get(key) || 0) + 1);
      }
    });

    this.stockPoints = Array.from(monthlyCounts.entries()).map(([key, quantity]) => {
      const [year, month] = key.split('-').map(Number);
      const monthName = new Date(year, month - 1, 1)
        .toLocaleString('en-US', { month: 'short' });

      return { date: monthName, quantity };
    });
  }

  private calculateCocoonCommitmentProgress(): void {
    const productions = this.getProductionsByCreatedDate();

    const reviewed = productions.filter(
      record => record.status === 'Reviewed'
    );

    const pending = productions.filter(
      record => record.status === 'Pending Review'
    );

    this.confirmedExpectedQuantity = reviewed.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );

    this.awaitingConfirmationQuantity = pending.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );

    this.totalExpectedQuantity =
      this.confirmedExpectedQuantity + this.awaitingConfirmationQuantity;

    // Physical receipt is not yet tracked by the current system.
    this.receivedQuantity = 0;

    this.productionUnit =
      productions.find(record => record.unit)?.unit ||
      this.allProductions.find(record => record.unit)?.unit ||
      'kg';
  }

  private generateSummaryMetrics(): void {
    const orders = this.getOrdersByCreatedDate();
    const productions = this.getProductionsByCreatedDate();

    const deliveredOrders = orders.filter(
      order => order.status === 'Delivered'
    );

    const reviewedQuantity = productions
      .filter(record => record.status === 'Reviewed')
      .reduce((total, record) => total + Number(record.quantity || 0), 0);

    const pendingQuantity = productions
      .filter(record => record.status === 'Pending Review')
      .reduce((total, record) => total + Number(record.quantity || 0), 0);

    const deliveredSilkQuantity = deliveredOrders.reduce(
      (total, order) =>
        total + Number(order.actualQuantityReceived ?? order.quantity ?? 0),
      0
    );

    const deliveryResults = this.getDeliveryPerformance(deliveredOrders);

    this.metrics = [
      {
        label: 'Partner Orders Fulfilled',
        value: String(deliveredOrders.length),
        description: `${deliveredSilkQuantity.toLocaleString()} kg silk yarn delivered`,
        icon: 'package-check',
      },
      {
        label: 'Confirmed Farmer Production',
        value: `${reviewedQuantity.toLocaleString()} ${this.productionUnit}`,
        description: 'Expected production reviewed by PTRI',
        icon: 'sprout',
      },
      {
        label: 'Pending Farmer Production',
        value: `${pendingQuantity.toLocaleString()} ${this.productionUnit}`,
        description: 'Production awaiting PTRI confirmation',
        icon: 'clock',
      },
      {
        label: 'On-Time Deliveries',
        value: deliveryResults.percentage === null
          ? 'N/A'
          : `${deliveryResults.percentage}%`,
        description: deliveryResults.eligible === 0
          ? 'No verifiable completed deliveries'
          : `${deliveryResults.onTime} of ${deliveryResults.eligible} verified deliveries`,
        icon: 'truck',
      },
    ];
  }

  private getDeliveryPerformance(deliveredOrders: SilkOrder[]): {
    onTime: number;
    eligible: number;
    percentage: number | null;
  } {
    let onTime = 0;
    let eligible = 0;

    deliveredOrders.forEach(order => {
      const actualDate = this.getDateValue(order.deliveredAt);
      const expectedDate = this.getDateValue(
        order.expectedDeliveryDate || order.deliveryDate
      );

      if (!actualDate || !expectedDate) return;

      eligible++;

      const actualDay = new Date(
        actualDate.getFullYear(),
        actualDate.getMonth(),
        actualDate.getDate()
      );

      const expectedDay = new Date(
        expectedDate.getFullYear(),
        expectedDate.getMonth(),
        expectedDate.getDate(),
        23, 59, 59, 999
      );

      if (actualDay <= expectedDay) {
        onTime++;
      }
    });

    return {
      onTime,
      eligible,
      percentage: eligible > 0
        ? Math.round((onTime / eligible) * 100)
        : null,
    };
  }

  private generateReportRows(): void {
    const orders = this.getOrdersByCreatedDate();
    const productions = this.getProductionsByCreatedDate();

    const deliveredOrders = orders.filter(
      order => order.status === 'Delivered'
    );

    const deliveredQuantity = deliveredOrders.reduce(
      (total, order) =>
        total + Number(order.actualQuantityReceived ?? order.quantity ?? 0),
      0
    );

    const reviewed = productions.filter(
      record => record.status === 'Reviewed'
    );

    const pending = productions.filter(
      record => record.status === 'Pending Review'
    );

    const reviewedQuantity = reviewed.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );

    const pendingQuantity = pending.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );

    const deliveryResults = this.getDeliveryPerformance(deliveredOrders);

    this.reportRows = [
      {
        area: 'Partner Fulfillment',
        measure: 'Delivered partner orders',
        result: `${deliveredOrders.length} orders · ${deliveredQuantity.toLocaleString()} kg`,
        context: deliveredOrders.length
          ? deliveredOrders.map(order => order.orderId).join(', ')
          : 'No delivered orders within the selected date range',
      },
      {
        area: 'Farmer Production',
        measure: 'Reviewed / pending production',
        result: `${reviewedQuantity.toLocaleString()} ${this.productionUnit} reviewed · ${pendingQuantity.toLocaleString()} ${this.productionUnit} pending`,
        context: `${reviewed.length} reviewed records · ${pending.length} pending records`,
      },
      {
        area: 'Delivery Performance',
        measure: 'Completed within scheduled date',
        result: deliveryResults.percentage === null
          ? 'N/A'
          : `${deliveryResults.onTime} of ${deliveryResults.eligible} · ${deliveryResults.percentage}%`,
        context: deliveryResults.eligible === 0
          ? 'No completed deliveries with verifiable delivery dates'
          : `${deliveredOrders.length} delivered orders found in the selected date range`,
      },
    ];
  }

  get reportSubtitle(): string {
    switch (this.reportType) {
      case 'Inventory Movement':
        return 'Inventory movement reporting is unavailable until stock receipt and release records are tracked.';
      case 'Farmer Production':
        return 'Monitor confirmed and pending farmer production quantities.';
      case 'Delivery Performance':
        return 'Review completed partner orders and their delivery schedules.';
      default:
        return 'Review partner fulfillment, farmer production, and delivery performance.';
    }
  }

  get filteredRows(): ReportRow[] {
    if (this.reportType === 'Inventory Movement') {
      return [];
    }

    if (this.reportType === 'Farmer Production') {
      return this.reportRows.filter(row =>
        row.area === 'Farmer Production'
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
    return Math.max(5, ...this.stockPoints.map(point => point.quantity));
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

  // ==========================================
  // PROFESSIONAL PDF EXPORT
  // ==========================================

  exportReport(): void {
    if (this.isLoading) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      this.drawPdfHeader(doc, pageWidth, margin);
      this.drawExecutiveSummary(doc, margin);
      this.drawMonthlyOrderChart(doc, margin);
      this.drawCocoonProgress(doc, margin);

      // Detailed records start on a separate page.
      doc.addPage();
      this.drawDetailedRecords(doc, margin);

      // Add consistent page headers and page numbers.
      const totalPages = doc.getNumberOfPages();

      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);

        if (page > 1) {
          doc.setDrawColor(...this.pdfGold);
          doc.setLineWidth(0.5);
          doc.line(margin, 13, pageWidth - margin, 13);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...this.pdfGreen);
          doc.text('DOST-PTRI | SILK SUPPLY AND DELIVERY', margin, 10);
        }

        doc.setDrawColor(...this.pdfGold);
        doc.setLineWidth(0.35);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...this.pdfMuted);
        doc.text(
          'PTRI Silk Supply and Delivery Communication System',
          margin,
          pageHeight - 9
        );

        doc.text(
          `Page ${page} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 9,
          { align: 'right' }
        );
      }

      const fileName = `PTRI-${this.reportType
        .toLowerCase()
        .replace(/\s+/g, '-')}-${this.startDate}-to-${this.endDate}.pdf`;

      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF report:', error);
    }
  }

  private drawPdfHeader(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setFillColor(...this.pdfIvory);
    doc.rect(0, 0, pageWidth, 66, 'F');

    // PTRI-inspired report mark
    doc.setFillColor(...this.pdfGreen);
    doc.roundedRect(margin, 14, 13, 13, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('P', margin + 4.1, 23);

    doc.setTextColor(...this.pdfGreen);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DOST-PTRI', margin + 18, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...this.pdfBrown);
    doc.text('PHILIPPINE TEXTILE RESEARCH INSTITUTE', margin + 18, 24);

    doc.setFillColor(...this.pdfGold);
    doc.roundedRect(pageWidth - margin - 35, 15, 35, 8, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL REPORT', pageWidth - margin - 17.5, 20.2, {
      align: 'center',
    });

    doc.setDrawColor(...this.pdfGold);
    doc.setLineWidth(0.7);
    doc.line(margin, 33, pageWidth - margin, 33);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(...this.pdfDarkGreen);
    doc.text(`${this.reportType.toUpperCase()} REPORT`, margin, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...this.pdfBrown);
    doc.text(this.reportSubtitle, margin, 50, {
      maxWidth: pageWidth - margin * 2,
    });

    doc.setFontSize(8);
    doc.setTextColor(...this.pdfMuted);
    doc.text(
      `Reporting Period: ${this.formatPdfDate(this.startDate)} – ${this.formatPdfDate(this.endDate)}`,
      margin,
      58
    );

    doc.text(
      `Generated: ${this.formatPdfDateTime(this.generatedAt)}`,
      pageWidth - margin,
      58,
      { align: 'right' }
    );
  }

  private drawExecutiveSummary(doc: jsPDF, margin: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardGap = 4;
    const cardWidth = (pageWidth - margin * 2 - cardGap) / 2;
    const cardHeight = 25;
    const startY = 76;

    this.drawSectionTitle(doc, 'EXECUTIVE SUMMARY', margin, startY);

    this.metrics.forEach((metric, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + column * (cardWidth + cardGap);
      const y = startY + 7 + row * (cardHeight + 4);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 219, 205);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      const accentColor = index === 1
        ? this.pdfBrown
        : index === 2
          ? this.pdfGold
          : this.pdfGreen;

      doc.setFillColor(...accentColor);
      doc.rect(x, y, 2, cardHeight, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...this.pdfMuted);
      doc.text(metric.label, x + 6, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...this.pdfGreen);
      doc.text(metric.value, x + 6, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...this.pdfBrown);
      doc.text(metric.description, x + 6, y + 21, {
        maxWidth: cardWidth - 11,
      });
    });
  }

  private drawMonthlyOrderChart(doc: jsPDF, margin: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const sectionY = 140;

    this.drawSectionTitle(doc, 'MONTHLY ORDER TREND', margin, sectionY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...this.pdfMuted);
    doc.text('Number of partner orders per month', margin, sectionY + 6);

    const chartX = margin + 12;
    const chartY = sectionY + 14;
    const chartWidth = pageWidth - margin * 2 - 17;
    const chartHeight = 39;
    const maxValue = Math.max(1, ...this.stockPoints.map(point => point.quantity));

    // Chart grid and Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (chartHeight / 4) * i;
      const value = Math.round(maxValue - (maxValue / 4) * i);

      doc.setDrawColor(229, 225, 216);
      doc.setLineWidth(0.2);
      doc.line(chartX, y, chartX + chartWidth, y);

      doc.setFontSize(6);
      doc.setTextColor(...this.pdfMuted);
      doc.text(String(value), chartX - 3, y + 1, { align: 'right' });
    }

    if (!this.stockPoints.length) {
      doc.setFontSize(9);
      doc.setTextColor(...this.pdfMuted);
      doc.text(
        'No monthly order data available for this period.',
        pageWidth / 2,
        chartY + 22,
        { align: 'center' }
      );
      return;
    }

    const points = this.stockPoints.map((point, index) => {
      const x = chartX + (
        this.stockPoints.length > 1
          ? index / (this.stockPoints.length - 1)
          : 0.5
      ) * chartWidth;

      const y = chartY + chartHeight -
        (point.quantity / maxValue) * chartHeight;

      return { x, y, point };
    });

    // Draw line graph
    doc.setDrawColor(...this.pdfGreen);
    doc.setLineWidth(1.1);

    for (let i = 0; i < points.length - 1; i++) {
      doc.line(
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y
      );
    }

    // Draw chart points and labels
    points.forEach(({ x, y, point }) => {
      doc.setFillColor(...this.pdfGold);
      doc.setDrawColor(...this.pdfGreen);
      doc.circle(x, y, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...this.pdfGreen);
      doc.text(String(point.quantity), x, y - 3, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...this.pdfBrown);
      doc.text(point.date, x, chartY + chartHeight + 5, {
        align: 'center',
      });
    });
  }

  private drawCocoonProgress(doc: jsPDF, margin: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const sectionY = 211;
    const barX = margin + 43;
    const barWidth = pageWidth - margin * 2 - 65;

    this.drawSectionTitle(doc, 'COCOON COMMITMENT PROGRESS', margin, sectionY);

    const progressItems = [
      {
        label: 'Received',
        quantity: this.receivedQuantity,
        percent: this.receivedPercent,
        color: this.pdfBrown,
      },
      {
        label: 'Confirmed Expected',
        quantity: this.confirmedExpectedQuantity,
        percent: this.confirmedExpectedPercent,
        color: this.pdfGreen,
      },
      {
        label: 'Awaiting Confirmation',
        quantity: this.awaitingConfirmationQuantity,
        percent: this.awaitingConfirmationPercent,
        color: this.pdfGold,
      },
    ];

    progressItems.forEach((item, index) => {
      const y = sectionY + 10 + index * 13;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...this.pdfText);
      doc.text(item.label, margin, y + 3);

      doc.setFillColor(232, 227, 216);
      doc.roundedRect(barX, y, barWidth, 4, 2, 2, 'F');

      if (item.percent > 0) {
        doc.setFillColor(...item.color);
        doc.roundedRect(
          barX,
          y,
          Math.max(1, barWidth * item.percent / 100),
          4,
          2,
          2,
          'F'
        );
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...this.pdfGreen);
      doc.text(
        `${item.quantity.toLocaleString()} ${this.productionUnit}`,
        pageWidth - margin,
        y + 3,
        { align: 'right' }
      );
    });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...this.pdfMuted);
    doc.text(
      'Received quantities are not yet tracked. Reviewed records represent confirmed expected production, not physical receipt.',
      margin,
      sectionY + 51,
      { maxWidth: pageWidth - margin * 2 }
    );
  }

  // ==========================================
  // DETAILED REPORT TABLES
  // ==========================================

  private drawDetailedRecords(doc: jsPDF, margin: number): void {
    this.pdfNextTableY = 38;

    const orders = this.getOrdersByCreatedDate();
    const productions = this.getProductionsByCreatedDate();

    const deliveredOrders = orders.filter(
      order => order.status === 'Delivered'
    );

    const title = this.reportType === 'Operational Summary'
      ? 'DETAILED OPERATIONAL RECORDS'
      : `DETAILED ${this.reportType.toUpperCase()} RECORDS`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...this.pdfGreen);
    doc.text(title, margin, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...this.pdfMuted);
    doc.text(
      `Reporting period: ${this.formatPdfDate(this.startDate)} – ${this.formatPdfDate(this.endDate)}`,
      margin,
      29
    );

    if (
      this.reportType === 'Operational Summary' ||
      this.reportType === 'Delivery Performance'
    ) {
      this.addPdfSectionTitle(doc, 'PARTNER ORDER FULFILLMENT');

      const orderRows = deliveredOrders.map(order => [
        order.orderId || order.id || '—',
        order.partnerName || '—',
        order.silkType || '—',
        `${Number(order.actualQuantityReceived ?? order.quantity ?? 0).toLocaleString()} kg`,
        this.formatPdfDate(order.expectedDeliveryDate || order.deliveryDate),
        order.status || '—',
      ]);

      this.addPdfTable(
        doc,
        ['Order ID', 'Partner', 'Silk Type', 'Quantity', 'Expected Date', 'Status'],
        orderRows,
        'No delivered partner orders found for this reporting period.'
      );
    }

    if (
      this.reportType === 'Operational Summary' ||
      this.reportType === 'Farmer Production'
    ) {
      this.addPdfSectionTitle(doc, 'FARMER PRODUCTION RECORDS');

      const productionRows = productions.map(record => [
        record.farmerName || '—',
        record.farmName || '—',
        record.productionType || '—',
        `${Number(record.quantity || 0).toLocaleString()} ${record.unit || this.productionUnit}`,
        this.formatPdfDate(record.expectedAvailability),
        record.status || '—',
        this.formatPdfDate(record.createdAt),
      ]);

      this.addPdfTable(
        doc,
        ['Farmer', 'Farm', 'Production', 'Quantity', 'Expected Availability', 'Status', 'Submitted'],
        productionRows,
        'No farmer production records found for this reporting period.'
      );
    }

    if (
      this.reportType === 'Operational Summary' ||
      this.reportType === 'Delivery Performance'
    ) {
      this.addPdfSectionTitle(doc, 'DELIVERY PERFORMANCE RECORDS');

      const deliveryRows = deliveredOrders.map(order => {
        const expectedDate = this.getDateValue(
          order.expectedDeliveryDate || order.deliveryDate
        );

        const actualDate = this.getDateValue(order.deliveredAt);

        let result = 'N/A';

        if (expectedDate && actualDate) {
          const expectedDay = new Date(
            expectedDate.getFullYear(),
            expectedDate.getMonth(),
            expectedDate.getDate()
          );

          const actualDay = new Date(
            actualDate.getFullYear(),
            actualDate.getMonth(),
            actualDate.getDate()
          );

          result = actualDay <= expectedDay ? 'On Time' : 'Delayed';
        }

        return [
          order.orderId || order.id || '—',
          order.partnerName || '—',
          this.formatPdfDate(order.expectedDeliveryDate || order.deliveryDate),
          this.formatPdfDate(order.deliveredAt),
          `${Number(order.actualQuantityReceived ?? order.quantity ?? 0).toLocaleString()} kg`,
          result,
        ];
      });

      this.addPdfTable(
        doc,
        ['Order ID', 'Partner', 'Expected Date', 'Delivered Date', 'Received Qty.', 'Performance'],
        deliveryRows,
        'No completed deliveries found for this reporting period.'
      );
    }

    if (this.reportType === 'Inventory Movement') {
      this.addPdfSectionTitle(doc, 'INVENTORY MOVEMENT');

      this.addPdfTable(
        doc,
        ['Information', 'Status'],
        [['Inventory movement records', 'Not currently tracked']],
        'Inventory movement reporting is unavailable until stock receipt and release records are implemented.'
      );
    }
  }

  private addPdfSectionTitle(doc: jsPDF, title: string): void {
    const margin = 15;
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = this.pdfNextTableY;

    // Move to a fresh page if there is insufficient room for the heading and table.
    if (y + 25 > pageHeight - 20) {
      doc.addPage();
      this.addPdfPageHeader(doc, margin);
      y = 25;
    }

    doc.setFillColor(...this.pdfLightGreen);
    doc.roundedRect(margin, y, 180, 9, 1.5, 1.5, 'F');

    doc.setFillColor(...this.pdfGold);
    doc.rect(margin, y, 1.5, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...this.pdfGreen);
    doc.text(title, margin + 4, y + 6);

    this.pdfNextTableY = y + 12;
  }

  private addPdfTable(
    doc: jsPDF,
    headers: string[],
    rows: string[][],
    emptyMessage: string
  ): void {
    const margin = 15;

    const body: any[] = rows.length
      ? rows
      : [{
          content: emptyMessage,
          colSpan: headers.length,
          styles: {
            halign: 'center',
            textColor: this.pdfMuted,
            fontStyle: 'italic',
          },
        }];

    autoTable(doc, {
      startY: this.pdfNextTableY,
      head: [headers],
      body,
      margin: {
        left: margin,
        right: margin,
        top: 20,
        bottom: 20,
      },
      theme: 'grid',
      showHead: 'everyPage',
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      headStyles: {
        fillColor: this.pdfGreen,
        textColor: [255, 255, 255],
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2.5,
        halign: 'left',
      },
      bodyStyles: {
        font: 'helvetica',
        fontSize: 7,
        textColor: this.pdfText,
        cellPadding: 2.5,
        lineColor: [225, 220, 210],
        lineWidth: 0.15,
        overflow: 'linebreak',
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [247, 246, 241],
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = [247, 246, 241];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || this.pdfNextTableY;
    this.pdfNextTableY = finalY + 12;
  }

  private addPdfPageHeader(doc: jsPDF, margin: number): void {
    doc.setDrawColor(...this.pdfGold);
    doc.setLineWidth(0.5);
    doc.line(
      margin,
      13,
      doc.internal.pageSize.getWidth() - margin,
      13
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...this.pdfGreen);
    doc.text('DOST-PTRI | SILK SUPPLY AND DELIVERY', margin, 10);
  }

  private drawSectionTitle(
    doc: jsPDF,
    title: string,
    x: number,
    y: number
  ): void {
    doc.setFillColor(...this.pdfGold);
    doc.roundedRect(x, y - 3.5, 1.5, 5, 0.5, 0.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...this.pdfGreen);
    doc.text(title, x + 4, y);
  }

  // ==========================================
  // PDF DATE FORMATTING
  // ==========================================

  private formatPdfDate(value: any): string {
    const date = this.getDateValue(value);

    if (!date) return '—';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  private formatPdfDateTime(value: Date): string {
    return value.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
