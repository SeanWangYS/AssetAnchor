import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

type AuthUser = FirebaseAuthTypes.User | null;

interface AuthState {
  user: AuthUser;
  status: 'loading' | 'ready';
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'ready' }),
}));
