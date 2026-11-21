
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((m) => m.LoginComponent)
  },

  // PUBLIC COCOON RETURN DETAILS
  // Accessible through QR code without logging in
  {
    path: 'cocoon-return/:token',
    loadComponent: () =>
      import('./public-cocoon-return/public-cocoon-return').then(
        (m) => m.PublicCocoonReturn
      )
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
        path: 'mulberry-production-monitoring',
        loadComponent: () =>
          import('./staff-portal/mulberry-production-monitoring/mulberry-production-monitoring').then(
            (m) => m.MulberryProductionMonitoring
          )
      },
      {
        path: 'mulberry-production-monitoring/:date',
        loadComponent: () =>
          import('./staff-portal/mulberry-production-monitoring/pruning-date-details/pruning-date-details').then(
            (m) => m.PruningDateDetails
          )
      },
      {
        path: 'silkworm-cocoon-management',
        loadComponent: () =>
          import('./staff-portal/silkworm-cocoon-management/silkworm-cocoon-management').then(
            (m) => m.SilkwormCocoonManagement
          )
      },
      {
        path: 'silkworm-cocoon-management/silkworm-batches',
        loadComponent: () =>
          import('./staff-portal/silkworm-cocoon-management/silkworm-batches/silkworm-batches').then(
            (m) => m.SilkwormBatches
          )
      },
      {
        path: 'silkworm-cocoon-management/cocoon-collection',
        loadComponent: () =>
          import('./staff-portal/silkworm-cocoon-management/cocoon-collection/cocoon-collection').then(
            (m) => m.CocoonCollection
          )
      },
      {
        path: 'silkworm-cocoon-management/production-history',
        loadComponent: () =>
          import('./staff-portal/silkworm-cocoon-management/production-history/production-history').then(
            (m) => m.ProductionHistory
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
            (m) => m.FarmersProductionComponent
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
        path: 'silk-orders/:id',
        loadComponent: () =>
          import('./staff-portal/order-details/order-details').then(
            (m) => m.OrderDetails
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
        path: 'profile',
        loadComponent: () =>
          import('./staff-portal/staff-profile/staff-profile').then(
            (m) => m.StaffProfile
          )
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./staff-portal/staff-settings/staff-settings').then(
            (m) => m.StaffSettings
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
        path: 'mulberry-production',
        loadComponent: () =>
          import('./farmer-portal/mulberry-production/mulberry-production').then(
            (m) => m.MulberryProduction
          )
      },
      {
        path: 'silkworm-cocoon-production',
        loadComponent: () =>
          import('./farmer-portal/silkworm-cocoon-production/silkworm-cocoon-production').then(
            (m) => m.SilkwormCocoonProduction
          )
      },
      {
        path: 'silkworm-requests-batches',
        loadComponent: () =>
          import('./farmer-portal/silkworm-requests-batches/silkworm-requests-batches').then(
            (m) => m.SilkwormRequestsBatches
          )
      },
      {
        path: 'cocoon-production',
        loadComponent: () =>
          import('./farmer-portal/cocoon-production/cocoon-production').then(
            (m) => m.CocoonProduction
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
        path: 'settings',
        loadComponent: () =>
          import('./farmer-portal/farmer-settings/farmer-settings').then(
            (m) => m.FarmerSettings
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
