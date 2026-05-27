import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelliGenda - L'agenda intelligente",
  description: "Il tuo software di prenotazione, senza complicazioni. Gestisci il tuo calendario e ricevi prenotazioni online.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "IntelliGenda - L'agenda intelligente",
    description: "Il tuo software di prenotazione, senza complicazioni. Gestisci il tuo calendario e ricevi prenotazioni online.",
    url: "https://intelligenda.it",
    siteName: "IntelliGenda",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IntelliGenda - L'agenda intelligente",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelliGenda - L'agenda intelligente",
    description: "Il tuo software di prenotazione, senza complicazioni. Gestisci il tuo calendario e ricevi prenotazioni online.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
