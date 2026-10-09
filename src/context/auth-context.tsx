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
    return Boolean(
      getCookie("admin_access_token") ||
        localStorage.getItem("admin_access_token")
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !getCookie("admin_access_token") && !localStorage.getItem("admin_access_token");
  });

  // Sync cookie ↔ localStorage after mount so middleware (which only reads
  // cookies) sees the token when the user came from a tab that stored the
  // token in localStorage only, and vice versa.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cookieToken = getCookie("admin_access_token");
    const localToken = localStorage.getItem("admin_access_token");
    if (!cookieToken && localToken) {
      setCookie("admin_access_token", localToken, 30);
    } else if (cookieToken && !localToken) {
      localStorage.setItem("admin_access_token", cookieToken);
    }
  }, []);

  // Listen for global unauthorized events to keep auth state consistent
  useEffect(() => {
    const handleUnauthorized = () => {
      setAdmin(null);
      setIsAuthenticated(false);
    };

    window.addEventListener("pf:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("pf:unauthorized", handleUnauthorized);
    };
  }, []);

  /**
   * Silently verifies or updates admin profile in the background without forcing logout on refresh.
   */
  const checkAuth = useCallback(async () => {
    let token = getCookie("admin_access_token");
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("admin_access_token");
      if (token) {
        setCookie("admin_access_token", token, 30);
      }
    }

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
      // Background verification failure handled gracefully
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

      if (!res || !res.accessToken) {
        throw new Error(
          res?.message || "Login did not return an access token. Please try again."
        );
      }
      if (res.success === false) {
        throw new Error(res.message || "Authentication failed.");
      }

      setCookie("admin_access_token", res.accessToken, 30);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_access_token", res.accessToken);
      }
      if (res.refreshToken) {
        setCookie("admin_refresh_token", res.refreshToken, 60);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_refresh_token", res.refreshToken);
        }
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
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
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
