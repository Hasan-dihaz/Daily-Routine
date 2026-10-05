import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'GRE Routine Planner',
  description: 'A prayer-aware GRE study planner for full-time professionals.',
  applicationName: 'GRE Planner',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'GRE Planner', statusBarStyle: 'default' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#315efb', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
