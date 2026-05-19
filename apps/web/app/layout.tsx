import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'BidReady KSA',
  description: 'Arabic-first, sector-configurable bid-readiness workspace',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
