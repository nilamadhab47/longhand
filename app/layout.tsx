import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans_Condensed,
  IBM_Plex_Serif,
} from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { posthogBrowserConfig } from "@/lib/posthog-config";
import "./globals.css";

const plexSans = IBM_Plex_Sans_Condensed({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-plex-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "longhand",
  description: "A quiet place for notes, drills, and recall.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "longhand",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", type: "image/png" },
    shortcut: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#EDEFE9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const posthog = posthogBrowserConfig();

  return (
    <html lang="en">
      <body
        className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} min-h-dvh bg-paper text-ink antialiased`}
      >
        <PwaRegister />
        <PostHogProvider projectKey={posthog.projectKey} host={posthog.host}>
          {children}
        </PostHogProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
