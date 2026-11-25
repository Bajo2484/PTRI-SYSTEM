
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SilkwormRequestService, SilkwormBatch } from '../../services/silkworm-request.service';
import { CocoonProductionService, CocoonReturnRecord } from '../../services/cocoon-production.service';

@Component({
  selector: 'app-silkworm-cocoon-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './silkworm-cocoon-management.html',
  styleUrl: './silkworm-cocoon-management.css',
})
export class SilkwormCocoonManagement implements OnInit {

  constructor(
    private silkwormRequestService: SilkwormRequestService,
    private cocoonProductionService: CocoonProductionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSummaryCards();
  }

  // ==========================================
  // PAGE HEADER / HERO SECTION
  // ==========================================

  pageTitle = 'Silkworm & Cocoon Management';
  pageSubtitle = 'Manage silkworm preparation, farmer deliveries, cocoon harvests, and production records in one organized workspace.';
  heroLabel = 'PRODUCTION MANAGEMENT';
  heroImage = '/images/silk-cocoons-hero.jpg';

  // ==========================================
  // COLOR PALETTE
  // ==========================================

  colors = {
    forestGreen: '#254B35',
    leafGreen: '#527747',
    silkGold: '#D8B66A',
    warmCream: '#F8F7F0',
    cocoonBrown: '#89694C',
    white: '#FFFFFF'
  };

  // ==========================================
  // PRODUCTION OVERVIEW
  // ==========================================

  summaryTitle = 'Production Overview';
  summaryLoading = true;

  summaryCards = [
    {
      id: 'active-batches',
      title: 'Active Silkworm Batches',
      value: '...',
      description: 'Currently managed batches',
      icon: 'bug',
      color: 'green'
    },
    {
      id: 'upcoming-deliveries',
      title: 'Upcoming Deliveries',
      value: '...',
      description: 'Batches scheduled for delivery',
      icon: 'truck',
      color: 'gold'
    },
    {
      id: 'cocoon-returns',
      title: 'Cocoon Returns',
      value: '...',
      description: 'Cocoon records and collections',
      icon: 'package-check',
      color: 'brown'
    }
  ];

  // ==========================================
  // LOAD LIVE SUMMARY COUNTS
  // ==========================================

  async loadSummaryCards(): Promise<void> {
    this.summaryLoading = true;

    try {
      const [batches, returns] = await Promise.all([
        this.silkwormRequestService.getAllBatches().catch(error => {
          console.error('Failed to load silkworm batches:', error);
          return null;
        }),
        this.cocoonProductionService.getAllReturnRecordsForStaff().catch(error => {
          console.error('Failed to load cocoon returns:', error);
          return null;
        })
      ]);

      // ACTIVE SILKWORM BATCHES
      const activeBatchCount = batches === null ? '—' : String(
        batches.filter(batch =>
          ['Assigned', 'Delivered', 'Received'].includes(batch.status)
        ).length
      );

      // UPCOMING DELIVERIES
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingDeliveryCount = batches === null ? '—' : String(
        batches.filter(batch => {
          if (batch.status !== 'Assigned' || !batch.deliveryDate) {
            return false;
          }

          const deliveryDate = new Date(`${batch.deliveryDate}T00:00:00`);
          return !Number.isNaN(deliveryDate.getTime()) && deliveryDate >= today;
        }).length
      );

      // COCOON RETURNS
      const cocoonReturnCount = returns === null ? '—' : String(
        returns.length
      );

      // UPDATE SUMMARY CARDS
      this.summaryCards = this.summaryCards.map(card => ({
        ...card,
        value:
          card.id === 'active-batches' ? activeBatchCount :
          card.id === 'upcoming-deliveries' ? upcomingDeliveryCount :
          card.id === 'cocoon-returns' ? cocoonReturnCount :
          card.value
      }));

    } catch (error) {
      console.error('Unable to load production summary:', error);
    } finally {
      this.summaryLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // MANAGEMENT MODULES
  // ==========================================

  managementTitle = 'Manage Production Activities';

  managementDescription = 'Access and manage the different stages of silkworm and cocoon production.';

  managementModules = [
    {
      id: 'silkworm-batches',
      title: 'Silkworm Batches',
      subtitle: 'Preparation & Batch Management',
      description: 'Manage preparation, batch details, quantities, and farmer deliveries.',
      image: '/images/silkworm-batches.jpg',
      imageAlt: 'Silkworms feeding on fresh mulberry leaves',
      route: '/staff/silkworm-cocoon-management/silkworm-batches',
      color: 'green',
      action: 'Manage Batches',
      actionIcon: 'arrow-right'
    },
    {
      id: 'cocoon-collection',
      title: 'Cocoon Collection',
      subtitle: 'Harvest & Return Monitoring',
      description: 'Review farmer harvest submissions, verify cocoon QR details, and record actual received weight.',
      image: '/images/cocoon-collection.jpg',
      imageAlt: 'White and golden silk cocoons in a woven basket',
      route: '/staff/silkworm-cocoon-management/cocoon-collection',
      color: 'gold',
      action: 'View Collection',
      actionIcon: 'arrow-right'
    },
    {
      id: 'production-history',
      title: 'Production History',
      subtitle: 'Production Records & Tracking',
      description: 'Review previous batches, harvest records, and completed cocoon returns.',
      image: '/images/production-history.jpg',
      imageAlt: 'Silk cocoons with production records and ledger',
      route: '/staff/silkworm-cocoon-management/production-history',
      color: 'brown',
      action: 'View History',
      actionIcon: 'arrow-right'
    }
  ];

  // ==========================================
  // BOTTOM INFORMATION NOTE
  // ==========================================

  informationNote = {
    icon: 'info',
    message: 'Keep production records organized to support efficient silkworm distribution and cocoon collection.'
  };

}
