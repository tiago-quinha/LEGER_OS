import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://leger-os.vercel.app"),
  title: {
    default: "LEGER_OS // Personal Finance Mainframe",
    template: "%s | LEGER_OS",
  },
  description: "High-precision paycheck cycle personal finance mainframe with real-time Apple Pay ingestion, recency decay burn modeling, and conversational AI CFO.",
  keywords: [
    "personal finance",
    "paycheck cycle budget",
    "apple pay shortcut expense tracker",
    "cash flow forecast",
    "recency decay spending",
    "fintech terminal",
    "pwa finance",
    "leger os",
  ],
  authors: [{ name: "LEGER_OS" }],
  creator: "LEGER_OS",
  publisher: "LEGER_OS",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://leger-os.vercel.app",
    title: "LEGER_OS // Personal Finance Mainframe",
    description: "High-precision paycheck cycle budget & cash flow forecasting with real-time Apple Pay ingestion.",
    siteName: "LEGER_OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "LEGER_OS // Personal Finance Mainframe",
    description: "Real-time Apple Pay & push notification ingestion paired with recency-weighted cash flow modeling.",
    creator: "@leger_os",
  },
  verification: {
    google: "wI5Q6JmT6qI670OSc49lBAloDVlhXX3-YVDCEQKQffo",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
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
      <body 
        className="min-h-full flex bg-background text-foreground font-sans overflow-x-hidden max-w-full"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
