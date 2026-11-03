
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

@Component({
  selector: 'app-mainlayout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout {
  isSidebarExpanded = false;
  isMobileMenuOpen = false;

  constructor(private router: Router) {}

  toggleSidebar(): void {
    if (window.innerWidth <= 1000) {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    } else {
      this.isSidebarExpanded = !this.isSidebarExpanded;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.closeMobileMenu();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
