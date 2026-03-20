import type { StoreConfig } from '@/types';

export interface SettingsSectionProps {
  config: StoreConfig;
  updateField: <K extends keyof StoreConfig>(field: K, value: StoreConfig[K]) => void;
}
