import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.css',
})
export class StaffDashboard {
  stats = [
    {
      title: 'Active partner orders',
      value: '6',
      detail: '120 kg requested · 2 pending review',
      icon: '▣',
      color: 'teal',
    },
    {
      title: 'Available silk yarn',
      value: '48 kg',
      detail: '120 kg on hand · 72 kg reserved',
      icon: '⬡',
      color: 'orange',
    },
    {
      title: 'Expected cocoon output',
      value: '420 kg',
      detail: '320 kg confirmed · 100 kg awaiting',
      icon: '♧',
      color: 'green',
    },
    {
      title: 'Scheduled movements',
      value: '4',
      detail: '2 deliveries · 2 farmer collections',
      icon: '⇄',
      color: 'blue',
    },
  ];

  stockDemand = [
    { date: '20 Oct', onHand: 120, reserved: 0 },
    { date: '21 Oct', onHand: 120, reserved: 18 },
    { date: '22 Oct', onHand: 120, reserved: 48 },
    { date: '23 Oct', onHand: 120, reserved: 72 },
  ];

  alerts = [
    {
      icon: '▣',
      title: 'Silk yarn is below threshold',
      description: '48 kg available · threshold 60 kg',
      action: 'Review inventory',
      type: 'orange',
      link: '/staff/inventory',
    },
    {
      icon: '♧',
      title: 'Confirm 100 kg of expected output',
      description: 'Ana Mendoza and Joel Ramos',
      action: 'Follow up with farmers',
      type: 'teal',
      link: '/staff/farmer-production',
    },
    {
      icon: '▤',
      title: '2 orders awaiting review',
      description: 'ORD-26-004 · ORD-26-005',
      action: 'Review partner orders',
      type: 'green',
      link: '/staff/orders',
    },
  ];

  recentOrders = [
    {
      id: 'ORD-26-001',
      partner: 'Habi Silk Cooperative',
      material: 'Silk yarn',
      quantity: '24 kg',
      requested: '26 Oct 2026',
      status: 'Scheduled',
    },
    {
      id: 'ORD-26-002',
      partner: 'Mindanao Silk Studio',
      material: 'Silk yarn',
      quantity: '18 kg',
      requested: '27 Oct 2026',
      status: 'Preparing',
    },
    {
      id: 'ORD-26-003',
      partner: 'Northern Silk Weavers',
      material: 'Silk yarn',
      quantity: '30 kg',
      requested: '29 Oct 2026',
      status: 'Confirmed',
    },
  ];

  upcomingMovements = [
    {
      day: '26',
      weekday: 'MON',
      title: 'Habi Silk Cooperative',
      description: 'Delivery · 24 kg silk yarn',
      time: '6:00 AM',
    },
    {
      day: '26',
      weekday: 'MON',
      title: 'Maria Santos · Claveria',
      description: 'Collection · 80 kg cocoons',
      time: '1:30 PM',
    },
    {
      day: '27',
      weekday: 'TUE',
      title: 'Mindanao Silk Studio',
      description: 'Delivery · 18 kg silk yarn',
      time: '10:00 AM',
    },
  ];

  getBarHeight(value: number): number {
    return (value / 160) * 100;
  }
}