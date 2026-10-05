"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <main className="min-h-screen w-full bg-[#FAF7EC]">{children}</main>;
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FAF7EC]">
      {/* Neo-Brutalist Sidebar (Desktop fixed + Mobile slide-out drawer) */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area - lg:pl-64 on desktop, pl-0 on mobile */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0 w-full bg-[#FAF7EC]">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
