import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[#F8F6F0] text-stone-900 font-sans selection:bg-[#E9B44C]/30 selection:text-[#133826]">
        {/* Persistent Dark Pine Forest Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col pl-64 min-w-0">
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
