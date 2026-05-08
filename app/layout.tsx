import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "peek",
  description: "browser-only screen sharing for classroom labs. consent-gated, read-only, FOSS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-ink font-sans font-light antialiased">
        {children}
        <a
          href="https://x.com/ohmdreams"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="by ohm"
          className="fixed bottom-4 right-5 text-sm text-ink-dim font-light tracking-tight lowercase hover:text-ink transition-colors z-50"
        >
          by ohm
        </a>
      </body>
    </html>
  );
}
