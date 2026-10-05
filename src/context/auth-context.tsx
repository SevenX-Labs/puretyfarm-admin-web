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
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Hydrates authentication state on initial mount using /auth/admin/get-me.
   */
  const checkAuth = useCallback(async () => {
    const token = getCookie("admin_access_token");
    if (!token) {
      setAdmin(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<
        AdminUser | { admin: AdminUser } | { data: AdminUser }
      >("/auth/admin/get-me");

      let adminData: AdminUser | null = null;
      if (res && typeof res === "object") {
        if ("admin" in res && res.admin) {
          adminData = res.admin;
        } else if ("data" in res && (res as { data: AdminUser }).data) {
          adminData = (res as { data: AdminUser }).data;
        } else if ("id" in res && (res as AdminUser).id) {
          adminData = res as AdminUser;
        }
      }

      if (adminData && adminData.email) {
        setAdmin(adminData);
        setIsAuthenticated(true);
      } else {
        throw new Error("Unable to parse admin profile");
      }
    } catch {
      deleteCookie("admin_access_token");
      deleteCookie("admin_refresh_token");
      setAdmin(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Authenticates admin with email & password, sets cookies, and navigates to '/'.
   */
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<LoginResponse>(
        "/auth/admin/login",
        { email, password },
        { skipAuth: true }
      );

      if (res.accessToken) {
        setCookie("admin_access_token", res.accessToken, 7);
      }
      if (res.refreshToken) {
        setCookie("admin_refresh_token", res.refreshToken, 30);
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
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logs out admin, cleans up cookies, and routes to '/login'.
   */
  const logout = useCallback(() => {
    deleteCookie("admin_access_token");
    deleteCookie("admin_refresh_token");
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
