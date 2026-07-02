import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SystemProvider } from "@/lib/SystemContext";
import { SystemGuard } from "@/components/SystemGuard";
import { AppLayout } from "@/components/AppLayout";

import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEGER_OS // Personal Finance Mainframe",
  description: "High-precision paycheck cycle budget and expense tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex bg-background text-foreground font-sans overflow-x-hidden max-w-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SystemProvider>
            <SystemGuard>
              <AppLayout>{children}</AppLayout>
            </SystemGuard>
          </SystemProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
