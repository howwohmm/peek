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
        <a
          href="/"
          aria-label="peek home"
          className="fixed top-5 left-6 flex items-center gap-2 text-ink hover:text-accent transition-colors z-50"
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6" aria-hidden>
            <ellipse cx="16" cy="16" rx="13" ry="6.5" stroke="#c9a96a" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="3.5" fill="#c9a96a" />
          </svg>
          <span className="text-base tracking-tight lowercase">peek</span>
        </a>
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
