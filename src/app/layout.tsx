import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "@radix-ui/themes/styles.css";
import AppThemeProvider from "@/components/AppThemeProvider";
import Header from "@/components/Header";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "CVE Search - Vulnerability Database",
  description: "Search and explore CVE vulnerability records from the global database. Powered by CIRCL vulnerability-lookup API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetBrainsMono.variable} min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-foreground)] antialiased`}
      >
        <AppThemeProvider>
          <Header />
          <main className="relative">
            <div className="grid-bg pointer-events-none fixed inset-0" />
            {/* Radial glow behind content */}
            <div className="pointer-events-none fixed left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,var(--color-glow),transparent_70%)]" />
            <div className="relative">{children}</div>
          </main>
        </AppThemeProvider>
      </body>
    </html>
  );
}
