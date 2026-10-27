
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAt9X-cKaFNhiIxnqnfeGPh8qkn7A46RmM',
  authDomain: 'ptri-silk-system.firebaseapp.com',
  projectId: 'ptri-silk-system',
  storageBucket: 'ptri-silk-system.firebasestorage.app',
  messagingSenderId: '189844208543',
  appId: '1:189844208543:web:c5d2b174d53b30fdc7dbaa'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
