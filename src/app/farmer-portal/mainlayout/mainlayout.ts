
import { Component } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { filter } from 'rxjs';
import {
  LucideAngularModule,
  Menu,
  X,
  House,
  Sprout,
  Package,
  Truck,
  MessageCircle,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

@Component({
  selector: 'app-farmer-mainlayout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
  ],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout {
  menuOpen = false;
  sidebarExpanded = false;

  readonly icons = {
    Menu,
    X,
    House,
    Sprout,
    Package,
    Truck,
    MessageCircle,
    UserRound,
    LogOut,
    ChevronLeft,
    ChevronRight,
  };

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen = false;
      });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleSidebar() {
    this.sidebarExpanded = !this.sidebarExpanded;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  async logout() {
    try {
      await signOut(auth);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
