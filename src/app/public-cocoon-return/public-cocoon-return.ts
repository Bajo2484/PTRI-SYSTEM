
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface PublicCocoonReturnRecord {
  returnNumber: string;
  harvestNumber: string;
  batchNumber: string;
  requestNumber: string;
  harvestDate: string;
  returnDate: string;
  cocoonWeight: number;
  cocoonQuantity: number;
  cocoonCondition: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-public-cocoon-return',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-cocoon-return.html',
  styleUrl: './public-cocoon-return.css'
})
export class PublicCocoonReturn implements OnInit {

  loading = true;
  errorMessage = '';

  record: PublicCocoonReturnRecord | null = null;

  private readonly apiUrl =
    'https://asia-southeast1-ptri-silk-system.cloudfunctions.net/getPublicCocoonReturn';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.loading = false;
      this.errorMessage = 'Invalid or missing QR code token.';
      return;
    }

    this.loadReturnDetails(token);
  }

  async loadReturnDetails(token: string): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.record = null;

    try {
      const response = await fetch(
        `${this.apiUrl}?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          cache: 'no-store'
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.record) {
        throw new Error(
          result.message || 'Cocoon return record could not be found.'
        );
      }

      this.record = result.record as PublicCocoonReturnRecord;

    } catch (error) {
      console.error('Public cocoon return loading failed:', error);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to retrieve cocoon return details. Please try again.';

    } finally {
      this.loading = false;
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'status-submitted';

      case 'received':
        return 'status-received';

      case 'verified':
        return 'status-verified';

      default:
        return 'status-default';
    }
  }

  formatWeight(weight: number): string {
    return `${Number(weight || 0).toFixed(2)} kg`;
  }

  retry(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (token) {
      this.loadReturnDetails(token);
    }
  }
}
