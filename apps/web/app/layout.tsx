import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import './globals.css';
import { loadCurrentUser } from '../lib/api';
import { AuthProvider } from '../lib/auth-context';

export const metadata: Metadata = {
  title: 'BidReady KSA',
  description: 'Arabic-first, sector-configurable bid-readiness workspace',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const user = await loadCurrentUser().catch(() => null);
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider initialUser={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
