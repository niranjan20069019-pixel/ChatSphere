import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (emailOrUsername, password) => {
        const res = await authApi.login({ emailOrUsername, password });
        const { user } = res.data.data;
        set({ user, isAuthenticated: true, isLoading: false });
        connectSocket();
      },

      register: async (data) => {
        const res = await authApi.register(data);
        const { user } = res.data.data;
        set({ user, isAuthenticated: true, isLoading: false });
        connectSocket();
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore
        }
        disconnectSocket();
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      initialize: async () => {
        try {
          await get().fetchMe();
          if (get().isAuthenticated) connectSocket();
        } catch {
          set({ isLoading: false, isAuthenticated: false, user: null });
        }
      },
    }),
    {
      name: 'chatsphere-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
