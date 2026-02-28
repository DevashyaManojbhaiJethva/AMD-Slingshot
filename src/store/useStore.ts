import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  photoURL?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      updateUser: (userUpdate) => set((state) => ({
        user: state.user ? { ...state.user, ...userUpdate } : state.user,
      })),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface SoilResult {
  jobId?: string;
  userId?: string;
  type: string;
  healthScore: number;
  fertility: number;
  ph: number;
  moisture: number;
  gsm?: number;
  granuleCount?: number;
  granuleDensity?: number;
  npk: { n: number; p: number; k: number };
  crops: { name: string; score: number; description?: string }[];
  fertilizerPlan?: {
    ureaKg: number;
    irrigation: string;
    recommendation?: string;
  };
  weather?: {
    temperatureC: number;
    humidity: number;
    rainfallMm?: number;
  };
  workPlan?: string[];
  imageUrls?: string[];
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  depthCm?: number;
  imageCount?: number;
}

interface JobState {
  jobId: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed' | null;
  stage: string | null;
  progress: number;
  depthCm?: number;
  imageCount?: number;
}

interface AppState {
  language: 'en' | 'hi';
  theme: 'light' | 'dark';
  soilResult: SoilResult | null;
  isProcessing: boolean;
  currentJob: JobState;
  history: SoilResult[];
  setLanguage: (lang: 'en' | 'hi') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSoilResult: (result: SoilResult | null) => void;
  setHistory: (history: SoilResult[]) => void;
  setIsProcessing: (status: boolean) => void;
  setCurrentJob: (job: Partial<JobState>) => void;
  addToHistory: (result: SoilResult) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      theme: 'light',
      soilResult: null,
      isProcessing: false,
      currentJob: {
        jobId: null,
        status: null,
        stage: null,
        progress: 0,
      },
      history: [],
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setSoilResult: (soilResult) => set({ soilResult }),
      setHistory: (history) => set({ history }),
      setIsProcessing: (isProcessing) => set({ isProcessing }),
      setCurrentJob: (job) => set((state) => ({ 
        currentJob: { ...state.currentJob, ...job } 
      })),
      addToHistory: (result) => set((state) => ({
        history: [result, ...state.history].slice(0, 10)
      })),
    }),
    {
      name: 'app-storage',
    }
  )
);

interface UiState {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) => set((state) => ({
    toasts: [
      ...state.toasts,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...toast,
      },
    ].slice(-4),
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),
}));
