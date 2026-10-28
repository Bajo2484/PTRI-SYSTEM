import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

@Component({
  selector: 'app-mainlayout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout {
  constructor(private router: Router) {}

  async logout() {
    try {
      await signOut(auth);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}