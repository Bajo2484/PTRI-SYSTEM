
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((m) => m.LoginComponent)
  },
  {
    path: 'staff/dashboard',
    loadComponent: () =>
      import('./staff-portal/staff-dashboard/staff-dashboard').then(
        (m) => m.StaffDashboard
      )
  },
  {
    path: 'partner/dashboard',
    loadComponent: () =>
      import('./partner-portal/partner-dashboard/partner-dashboard').then(
        (m) => m.PartnerDashboard
      )
  },
  {
    path: 'farmer/dashboard',
    loadComponent: () =>
      import('./farmer-portal/farmer-dashboard/farmer-dashboard').then(
        (m) => m.FarmerDashboard
      )
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
