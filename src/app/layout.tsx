import type { Metadata } from 'next';
import '@shopify/polaris/build/esm/styles.css';
import './globals.css';
import { PolarisProvider } from './PolarisProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Kiosko',
  description: 'Gestión inteligente para tiendas de abarrotes',
};

/**
 * Root Layout - Minimal shared wrapper
 * 
 * Route-specific providers:
 * - (main) group: AuthProvider + OfflineProvider
 * - (public) group: No auth (customer display)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
      </head>
      <body suppressHydrationWarning>
        <PolarisProvider>
          {children}
        </PolarisProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
