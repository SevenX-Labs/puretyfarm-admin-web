import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppShell } from "@/components/layout/app-shell";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Puretyfarm Admin • Raipur A2 Dairy Operations",
  description:
    "Operations dashboard for Puretyfarm A2 Desi Gir Cow Milk delivery in Raipur, Chhattisgarh. Handles morning dispatch, 10 PM engine cutoff, wallets, and subscriptions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[#F8F6F0] text-stone-900 font-sans selection:bg-[#E9B44C]/30 selection:text-[#133826]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
