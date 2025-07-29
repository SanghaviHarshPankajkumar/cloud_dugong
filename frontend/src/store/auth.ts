import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  sessionId: string | null;
  username: string | null;
  email: string | null;
  setToken: (token: string) => void;
  clearStore: () => void;
  setSessionId: (sessionId: string) => void;
  clearSessionId: () => void;
  setUsername: (username: string) => void;
  setEmail: (email: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      sessionId: null,
      username: null,
      email: null,
      setUsername: (username) => set({ username }),
      setEmail: (email) => set({ email }),
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      clearStore: () =>
        set({
          token: null,
          isAuthenticated: false,
          username: null,
          email: null,
        }),
      setSessionId: (sessionId) => set({ sessionId }),
      clearSessionId: () => set({ sessionId: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        sessionId: state.sessionId,
        username: state.username,
        email: state.email,
      }),
    }
  )
);
