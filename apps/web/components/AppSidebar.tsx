import type { JSX } from 'react';
import { t, type Locale } from '../lib/i18n';

interface NavItem {
  href: string;
  key:
    | 'navDashboard'
    | 'navTenders'
    | 'navDocuments'
    | 'navCompliance'
    | 'navReports'
    | 'navAdmin'
    | 'navSettings';
}

const NAV: NavItem[] = [
  { href: '/', key: 'navDashboard' },
  { href: '/tenders', key: 'navTenders' },
  { href: '/documents', key: 'navDocuments' },
  { href: '/compliance', key: 'navCompliance' },
  { href: '/reports', key: 'navReports' },
  { href: '/admin', key: 'navAdmin' },
  { href: '/settings', key: 'navSettings' },
];

export function AppSidebar({ locale }: { locale: Locale }): JSX.Element {
  return (
    <nav className="app-sidebar" aria-label={t('navDashboard', locale)}>
      <ul>
        {NAV.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{t(item.key, locale)}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
