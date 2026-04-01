import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { authApi, getApiErrorMessage, getApiErrorStatus } from "@/lib/api";
import { secureStorage } from "@/lib/secureStorage";
import type { User } from "@/lib/types";

interface AuthResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string, username: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  forgotPassword: (email: string) => Promise<AuthResult>;
  resetPassword: (token: string, password: string) => Promise<AuthResult>;
  updateUser: (data: { name?: string; username?: string; avatar?: string }) => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
  googleSignIn: (accessToken: string) => Promise<AuthResult>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,

    init: async () => {
      try {
        const token = await secureStorage.getItem("auth_token");
        const userJson = await secureStorage.getItem("user");

        if (token && userJson) {
          const user = JSON.parse(userJson) as User;
          set({ user, token, isLoading: false, isAuthenticated: true });
        } else {
          set({ user: null, token: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error("Error loading auth:", error);
        set({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    },

    login: async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await authApi.login(email, password);
        set({
          user: response.user,
          token: response.token,
          isLoading: false,
          isAuthenticated: true,
        });
        return { success: true };
      } catch (error: any) {
        console.error("Login error:", error);
        const errorMessage = getApiErrorMessage(error, "Login failed");
        if (errorMessage.toLowerCase().includes("verify") || errorMessage.toLowerCase().includes("verified")) {
          return { success: false, error: errorMessage, needsVerification: true };
        }
        return { success: false, error: errorMessage };
      }
    },

    register: async (email: string, password: string, name: string, username: string): Promise<AuthResult> => {
      try {
        await authApi.register(email, password, name, username);
        return { success: true, needsVerification: true };
      } catch (error: any) {
        console.error("Register error:", error);
        return { success: false, error: getApiErrorMessage(error, "Registration failed") };
      }
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch (error) {
        if (getApiErrorStatus(error) !== 401) {
          console.error("Logout error:", error);
        }
      } finally {
        set({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    },

    verifyEmail: async (token: string): Promise<AuthResult> => {
      try {
        await authApi.verifyEmail(token);
        return { success: true };
      } catch (error: any) {
        console.error("Verify email error:", error);
        return { success: false, error: getApiErrorMessage(error, "Verification failed") };
      }
    },

    resendVerification: async (email: string): Promise<AuthResult> => {
      try {
        await authApi.regenerateVerify(email);
        return { success: true };
      } catch (error: any) {
        console.error("Resend verification error:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to resend verification email") };
      }
    },

    forgotPassword: async (email: string): Promise<AuthResult> => {
      try {
        await authApi.forgotPassword(email);
        return { success: true };
      } catch (error: any) {
        console.error("Forgot password error:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to send reset email") };
      }
    },

    resetPassword: async (token: string, password: string): Promise<AuthResult> => {
      try {
        await authApi.resetPassword(token, password);
        return { success: true };
      } catch (error: any) {
        console.error("Reset password error:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to reset password") };
      }
    },

    updateUser: async (data: { name?: string; username?: string; avatar?: string }): Promise<AuthResult> => {
      try {
        await userApi.update(data);
        const updatedUser = await userApi.getMe();
        await secureStorage.setItem("user", JSON.stringify(updatedUser));
        set((state) => ({ ...state, user: updatedUser }));
        return { success: true };
      } catch (error: any) {
        console.error("Update user error:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to update profile") };
      }
    },

    refreshUser: async () => {
      try {
        const user = await userApi.getMe();
        await secureStorage.setItem("user", JSON.stringify(user));
        set((state) => ({ ...state, user }));
      } catch (error) {
        console.error("Refresh user error:", error);
      }
    },

    googleSignIn: async (accessToken: string): Promise<AuthResult> => {
      try {
        const response = await authApi.googleSignIn(accessToken);
        set({
          user: response.user,
          token: response.token,
          isLoading: false,
          isAuthenticated: true,
        });
        return { success: true };
      } catch (error: any) {
        console.error("Google Sign-In error:", error);
        return { success: false, error: getApiErrorMessage(error, "Google Sign-In failed") };
      }
    },
  })),
);

// Convenience hook matching existing API
export function useAuth() {
  return useAuthStore();
}
