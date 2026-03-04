import type { Metadata } from 'next';
import '@shopify/polaris/build/esm/styles.css';
import './globals.css';
import { PolarisProvider } from './PolarisProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';

export const metadata: Metadata = {
  title: 'Dashboard de Abarrotes',
  description: 'Gestión inteligente para tiendas de abarrotes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <PolarisProvider>{children}</PolarisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
