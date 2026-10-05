"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import type {
  AdminUser,
  AuthContextType,
  LoginResponse,
  ChangePasswordResponse,
} from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Instant synchronous hydration from localStorage & cookies to prevent logout on refresh
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("pf_admin_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getCookie("admin_access_token"));
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !getCookie("admin_access_token");
  });

  /**
   * Silently verifies or updates admin profile in the background without forcing logout on refresh.
   */
  const checkAuth = useCallback(async () => {
    const token = getCookie("admin_access_token");
    if (!token) {
      setAdmin(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Keep session active immediately
    setIsAuthenticated(true);

    try {
      const res = await apiClient.get<
        AdminUser | { admin: AdminUser } | { data: AdminUser } | { user: AdminUser }
      >("/auth/admin/get-me", { skipAuthRedirect: true });

      let adminData: AdminUser | null = null;
      if (res && typeof res === "object") {
        if ("admin" in res && res.admin) {
          adminData = res.admin;
        } else if ("user" in res && (res as { user: AdminUser }).user) {
          adminData = (res as { user: AdminUser }).user;
        } else if ("data" in res && (res as { data: AdminUser }).data) {
          adminData = (res as { data: AdminUser }).data;
        } else if ("id" in res && (res as AdminUser).id) {
          adminData = res as AdminUser;
        }
      }

      if (adminData && adminData.email) {
        setAdmin(adminData);
        if (typeof window !== "undefined") {
          localStorage.setItem("pf_admin_user", JSON.stringify(adminData));
        }
      }
    } catch {
      // NOTE: Do NOT delete cookies or log out on refresh failure!
      // This prevents Render cold-starts or backend transient issues from logging out the owner.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Authenticates admin with email & password, sets cookies & localStorage, and navigates to '/'.
   */
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<LoginResponse>(
        "/auth/admin/login",
        { email, password },
        { skipAuth: true, skipAuthRedirect: true }
      );

      if (res.accessToken) {
        setCookie("admin_access_token", res.accessToken, 30);
      }
      if (res.refreshToken) {
        setCookie("admin_refresh_token", res.refreshToken, 60);
      }

      const adminUser: AdminUser =
        res.admin ||
        ((res as unknown as { user: AdminUser }).user) || {
          id: "",
          email,
          role: "ADMIN",
        };

      setAdmin(adminUser);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("pf_admin_user", JSON.stringify(adminUser));
      }
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Explicit user logout: clears cookies, localStorage, and routes to '/login'.
   */
  const logout = useCallback(() => {
    deleteCookie("admin_access_token");
    deleteCookie("admin_refresh_token");
    if (typeof window !== "undefined") {
      localStorage.removeItem("pf_admin_user");
    }
    setAdmin(null);
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  /**
   * Calls POST /auth/admin/change-password with current & new passwords.
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponse> => {
    return await apiClient.post<ChangePasswordResponse>(
      "/auth/admin/change-password",
      {
        currentPassword,
        newPassword,
      }
    );
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
