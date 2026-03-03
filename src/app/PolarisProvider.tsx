'use client';

import { AppProvider } from '@shopify/polaris';
import esTranslations from '@shopify/polaris/locales/es.json';
import dynamic from 'next/dynamic';
import { ToastProvider } from '@/components/notifications/ToastProvider';

const PolarisVizProvider = dynamic(
  () => import('@shopify/polaris-viz').then((mod) => mod.PolarisVizProvider),
  { ssr: false }
);

export function PolarisProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={esTranslations}>
      <PolarisVizProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </PolarisVizProvider>
    </AppProvider>
  );
}
