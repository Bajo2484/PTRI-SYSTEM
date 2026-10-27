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

    if (!this.email.trim() || !this.password) {
      this.errorMessage =
        'ERROR: Please enter your email and password.';
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
      console.log('STEP 1: Connecting to Firebase Authentication...');

      const credential = await signInWithEmailAndPassword(
        auth,
        this.email.trim(),
        this.password
      );

      const user = credential.user;

      console.log('SUCCESS: Firebase Authentication login successful.');
      console.log('Authenticated email:', user.email);
      console.log('Authenticated UID:', user.uid);
      console.log('Firebase project ID:', auth.app.options.projectId);

      console.log('STEP 2: Searching for user in Firestore...');

      const userRef = doc(db, 'users', user.uid);

      console.log('Firestore document path:', `users/${user.uid}`);

      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        console.error('ERROR: User document NOT FOUND in Firestore.');
        console.error('Check the users collection and document ID.');

        this.errorMessage =
          'ERROR: Login succeeded, but the user account was NOT FOUND in Firestore.';

        await auth.signOut();
        return;
      }

      console.log('SUCCESS: User document FOUND in Firestore.');

      const userData = userSnapshot.data();
      const role = userData['role'];

      console.log('Firestore email:', userData['email']);
      console.log('Firestore fullName:', userData['fullName']);
      console.log('Firestore role:', role);

      if (
        !userData['email'] ||
        userData['email'].toLowerCase() !==
          (user.email ?? '').toLowerCase()
      ) {
        console.error(
          'ERROR: Authentication email does not match Firestore email.'
        );

        this.errorMessage =
          'ERROR: The account email does not match the Firestore record.';

        await auth.signOut();
        return;
      }

      console.log('SUCCESS: Authentication email matches Firestore.');
      console.log('========== LOGIN DEBUG END ==========');

      switch (role) {
        case 'staff':
          console.log('Redirecting to Staff Dashboard...');
          await this.router.navigateByUrl('/staff/dashboard');
          break;

        case 'partner':
          console.log('Redirecting to Partner Dashboard...');
          await this.router.navigateByUrl('/partner/dashboard');
          break;

        case 'farmer':
          console.log('Redirecting to Farmer Dashboard...');
          await this.router.navigateByUrl('/farmer/dashboard');
          break;

        default:
          console.error(
            'ERROR: Missing or invalid user role:',
            role
          );

          this.errorMessage =
            'ERROR: User found in Firestore, but the role is missing or invalid.';

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

      console.error(
        'ERROR: Login or Firestore operation failed:',
        error
      );

      console.error('Firebase error code:', code);

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        this.errorMessage = 'ERROR: Invalid email or password.';
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
          'ERROR: Firestore access denied. Check your Firestore security rules.';
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
