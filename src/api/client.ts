import axios from 'axios';
import { auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
});

const waitForFirebaseUser = (timeoutMs = 4000): Promise<User | null> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
};

export const getFirebaseAuthHeader = async (fallbackUserId?: string) => {
  const currentUser = auth.currentUser ?? (await waitForFirebaseUser());
  if (!currentUser) {
    if (import.meta.env.DEV && fallbackUserId) {
      return {
        'X-Dev-User-Id': fallbackUserId,
      };
    }
    throw new Error('AUTH_REQUIRED');
  }

  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'X-Dev-User-Id': currentUser.uid,
  };
};
