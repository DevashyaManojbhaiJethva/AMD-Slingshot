import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBKlVvgXjonNgmOLsW01BjZRXxsPKvLGlQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agrisoil-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agrisoil-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agrisoil-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "446597786972",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:446597786972:web:2d93eb1dc4343ef934e599",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
