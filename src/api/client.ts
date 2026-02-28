import axios from 'axios';
import { auth } from '../firebase';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
});

export const getFirebaseAuthHeader = async (fallbackUserId?: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    if (fallbackUserId) {
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
