
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  Plus,
  Users,
  PackageCheck,
  Wheat,
  Search,
  X,
  ListFilter,
  MapPin,
  Phone,
  Mail,
  Eye,
  Pencil,
  MessageCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Save,
  Package,
  Sprout,
  Building2,
  ClipboardList,
  Clock,
  MessageSquare,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    importProvidersFrom(
      LucideAngularModule.pick({
        Plus,
        Users,
        PackageCheck,
        Wheat,
        Search,
        X,
        ListFilter,
        MapPin,
        Phone,
        Mail,
        Eye,
        Pencil,
        MessageCircle,
        Info,
        ChevronLeft,
        ChevronRight,
        Save,
        Package,
        Sprout,
        Building2,
        ClipboardList,
        Clock,
        MessageSquare,
      })
    )
  ]
};
