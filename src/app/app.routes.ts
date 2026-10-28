
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((m) => m.LoginComponent)
  },

  // STAFF PORTAL
  {
    path: 'staff',
    loadComponent: () =>
      import('./staff-portal/mainlayout/mainlayout').then(
        (m) => m.Mainlayout
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./staff-portal/staff-dashboard/staff-dashboard').then(
            (m) => m.StaffDashboard
          )
      },
      {
        path: 'partners',
        redirectTo: 'partner-management',
        pathMatch: 'full'
      },
      {
        path: 'partner-management',
        loadComponent: () =>
          import('./staff-portal/partner-management/partner-management').then(
            (m) => m.PartnerManagement
          )
      },
      {
        path: 'farmers',
        redirectTo: 'farmer-management',
        pathMatch: 'full'
      },
      {
        path: 'farmer-management',
        loadComponent: () =>
          import('./staff-portal/farmer-management/farmer-management').then(
            (m) => m.FarmerManagement
          )
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./staff-portal/messages/messages').then(
            (m) => m.Messages
          )
      },
      {
        path: 'farmer-production',
        loadComponent: () =>
          import('./staff-portal/farmer-production/farmer-production').then(
            (m) => m.FarmerProduction
          )
      },
      {
        path: 'orders',
        redirectTo: 'silk-orders',
        pathMatch: 'full'
      },
      {
        path: 'silk-orders',
        loadComponent: () =>
          import('./staff-portal/silk-orders/silk-orders').then(
            (m) => m.SilkOrders
          )
      },
      {
        path: 'deliveries',
        redirectTo: 'supply-delivery',
        pathMatch: 'full'
      },
      {
        path: 'supply-delivery',
        loadComponent: () =>
          import('./staff-portal/supply-delivery/supply-delivery').then(
            (m) => m.SupplyDelivery
          )
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./staff-portal/reports/reports').then(
            (m) => m.Reports
          )
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // PARTNER PORTAL
  {
    path: 'partner',
    loadComponent: () =>
      import('./partner-portal/mainlayout/mainlayout').then(
        (m) => m.Mainlayout
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./partner-portal/partner-dashboard/partner-dashboard').then(
            (m) => m.PartnerDashboard
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./partner-portal/my-orders/my-orders').then(
            (m) => m.MyOrders
          )
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./partner-portal/deliveries/deliveries').then(
            (m) => m.Deliveries
          )
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./partner-portal/messages/messages').then(
            (m) => m.Messages
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./partner-portal/profile/profile').then(
            (m) => m.Profile
          )
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // FARMER PORTAL
  {
    path: 'farmer',
    loadComponent: () =>
      import('./farmer-portal/mainlayout/mainlayout').then(
        (m) => m.Mainlayout
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./farmer-portal/farmer-dashboard/farmer-dashboard').then(
            (m) => m.FarmerDashboard
          )
      },
      {
        path: 'production',
        loadComponent: () =>
          import('./farmer-portal/farmer-production/farmer-production').then(
            (m) => m.FarmerProduction
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./farmer-portal/farmer-orders/farmer-orders').then(
            (m) => m.FarmerOrders
          )
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./farmer-portal/farmer-deliveries/farmer-deliveries').then(
            (m) => m.FarmerDeliveries
          )
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./farmer-portal/farmer-messages/farmer-messages').then(
            (m) => m.FarmerMessages
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./farmer-portal/farmer-profile/farmer-profile').then(
            (m) => m.FarmerProfile
          )
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // DEFAULT ROUTES
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
