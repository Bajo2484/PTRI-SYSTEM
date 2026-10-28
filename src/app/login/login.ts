
import Swal from 'sweetalert2';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  getDoc
} from 'firebase/firestore';
import { Router } from '@angular/router';
import { auth, db } from '../services/firebase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  loading = false;
  errorMessage = '';

  constructor(private router: Router) {}

  async onSignIn(): Promise<void> {
    this.errorMessage = '';

    const loginInput = this.email.trim();

    if (!loginInput || !this.password) {
      this.errorMessage =
        'ERROR: Please enter your email or username and password.';
      return;
    }

    this.loading = true;

    Swal.fire({
      title: 'Signing In',
      text: 'Please wait while we verify your account...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#ffffff',
      color: '#24352b',
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      console.log('========== LOGIN DEBUG START ==========');

      // Staff and Partner use email.
      // Farmer uses username, converted to the internal email.
const loginEmail = loginInput.includes('@')
  ? loginInput
  : `${loginInput.toLowerCase()}@farmers.ptrisilksystem.com`;

      const credential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        this.password
      );

      const user = credential.user;

      console.log('Firebase Authentication login successful.');
      console.log('Authenticated UID:', user.uid);

      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        this.errorMessage =
          'ERROR: The user account was not found in Firestore.';
        await auth.signOut();
        return;
      }

      const userData = userSnapshot.data();
      const role = userData['role'];

      if (
        !userData['email'] ||
        userData['email'].toLowerCase() !==
          (user.email ?? '').toLowerCase()
      ) {
        this.errorMessage =
          'ERROR: The account email does not match the Firestore record.';
        await auth.signOut();
        return;
      }

      console.log('User role:', role);
      console.log('========== LOGIN DEBUG END ==========');

      switch (role) {
        case 'staff':
          await this.router.navigateByUrl('/staff/dashboard');
          break;

        case 'partner':
          await this.router.navigateByUrl('/partner/dashboard');
          break;

        case 'farmer':
          await this.router.navigateByUrl('/farmer/dashboard');
          break;

        default:
          this.errorMessage =
            'ERROR: User role is missing or invalid.';
          await auth.signOut();
          break;
      }
    } catch (error: unknown) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? String(error.code)
          : '';

      console.error('Login or Firestore operation failed:', error);
      console.error('Firebase error code:', code);

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        this.errorMessage =
          'ERROR: Invalid email/username or password.';
      } else if (code === 'auth/too-many-requests') {
        this.errorMessage =
          'ERROR: Too many attempts. Please try again later.';
      } else if (code === 'auth/network-request-failed') {
        this.errorMessage =
          'ERROR: Check your internet connection.';
      } else if (
        code === 'permission-denied' ||
        code === 'firestore/permission-denied'
      ) {
        this.errorMessage =
          'ERROR: Firestore access denied. Check your security rules.';
      } else {
        this.errorMessage =
          `ERROR: Something went wrong. ${code || 'Check the browser console.'}`;
      }
    } finally {
      this.loading = false;
      Swal.close();
    }
  }

  async onForgotPassword(): Promise<void> {
    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage =
        'Please enter your email address first to reset your password.';
      return;
    }

    if (!this.email.trim().includes('@')) {
      this.errorMessage =
        'Farmer password resets must be handled by the system administrator.';
      return;
    }

    try {
      await sendPasswordResetEmail(auth, this.email.trim());

      this.errorMessage =
        'If the account exists, a password reset email will be sent.';
    } catch (error) {
      console.error('Password reset error:', error);

      this.errorMessage =
        'Unable to process the password reset. Please try again.';
    }
  }

  onContactAdmin(): void {
    this.errorMessage =
      'Please contact the system administrator for assistance.';
  }
}
