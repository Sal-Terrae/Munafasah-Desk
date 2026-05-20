import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import { Tajawal, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { loadCurrentUser } from '../lib/api';
import { AuthProvider } from '../lib/auth-context';
import { LocaleProvider } from '../lib/locale-context';
import { resolveServerLocale } from '../lib/locale';
import { dir } from '../lib/i18n';

export const metadata: Metadata = {
  title: 'BidReady KSA',
  description: 'Arabic-first, sector-configurable bid-readiness workspace',
};

export const dynamic = 'force-dynamic';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const [user, locale] = await Promise.all([
    loadCurrentUser().catch(() => null),
    resolveServerLocale(),
  ]);
  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${tajawal.variable} ${plex.variable}`}
    >
      <body>
        <AuthProvider initialUser={user}>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
