import type { Metadata, Viewport } from "next";
import { Inter, Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";
import { ToastProvider } from "@/lib/toast-context";
import ToastContainer from "@/components/ToastContainer";
import CapacitorInit from "@/components/CapacitorInit";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-syne" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-dm-sans" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Warehouse Manager",
  description: "Multi-company warehouse management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WM",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${syne.variable} ${dmSans.variable} ${inter.className} bg-gray-50`}>
        <AuthProvider>
          <ToastProvider>
            <CapacitorInit />
            <AppShell>
              {children}
            </AppShell>
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
