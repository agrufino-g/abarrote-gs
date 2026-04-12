/**
 * Servicios Provider Registry
 *
 * Manages which provider is active and provides a single entry point
 * for the application to interact with the current provider.
 *
 * Architecture:
 * ┌──────────────────────────────────────────────────────┐
 * │  Server Actions (servicios-actions.ts)               │
 * │       │                                              │
 * │       ▼                                              │
 * │  getActiveProvider()                                 │
 * │       │                                              │
 * │       ├── LocalProvider  (default, no API calls)     │
 * │       ├── TuRecargaProvider  (future)                │
 * │       ├── InfopagoProvider   (future)                │
 * │       └── BillpocketProvider (future)                │
 * └──────────────────────────────────────────────────────┘
 *
 * To add a new provider:
 * 1. Create a file in ./providers/ implementing ServiciosProvider
 * 2. Register it in PROVIDER_FACTORIES below
 * 3. Add the config fields to storeConfig schema if needed
 * 4. Done — the user selects it in Settings > Servicios
 */

import { logger } from '@/lib/logger';
import type { ServiciosProvider } from './provider-adapter';
import { LocalProvider } from './providers/local-provider';
import { TuRecargaProvider } from './providers/turecarga-provider';
import { InfopagoProvider } from './providers/infopago-provider';
import { BillpocketProvider } from './providers/billpocket-provider';

// ══════════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ══════════════════════════════════════════════════════════════

/**
 * Configuration needed to initialize a servicios provider.
 * Each provider takes its own config shape.
 */
export interface ServiciosProviderConfig {
  /** Which provider to use */
  providerId: 'local' | 'turecarga' | 'infopago' | 'billpocket' | string;
  /** Provider-specific API key */
  apiKey?: string;
  /** Provider-specific secret */
  apiSecret?: string;
  /** Provider API base URL (some allow sandbox vs production) */
  baseUrl?: string;
  /** Whether to use sandbox/test mode */
  sandbox?: boolean;
}

/**
 * Factory map — each provider ID maps to a function that creates the provider.
 * Add new providers here as they are integrated.
 */
const PROVIDER_FACTORIES: Record<string, (config: ServiciosProviderConfig) => ServiciosProvider> = {
  local: () => new LocalProvider(),
  turecarga: (cfg) => new TuRecargaProvider(cfg.apiKey!, cfg.apiSecret!, cfg.sandbox ?? false),
  infopago: (cfg) => new InfopagoProvider(cfg.apiKey!, cfg.sandbox ?? false),
  billpocket: (cfg) => new BillpocketProvider(cfg.apiKey!, cfg.apiSecret!, cfg.sandbox ?? false),
};

/** Cached provider instance (singleton per request lifecycle) */
let _cachedProvider: ServiciosProvider | null = null;
let _cachedProviderId: string | null = null;

/**
 * Get the currently active servicios provider.
 *
 * Reads the config from the database/env and returns the appropriate adapter.
 * Falls back to LocalProvider if no provider is configured.
 */
export function getActiveProvider(config?: ServiciosProviderConfig): ServiciosProvider {
  const providerId = config?.providerId ?? 'local';

  // Return cached if same provider
  if (_cachedProvider && _cachedProviderId === providerId) {
    return _cachedProvider;
  }

  const factory = PROVIDER_FACTORIES[providerId];
  if (!factory) {
    logger.warn('Unknown servicios provider, falling back to local', {
      action: 'servicios_provider_fallback',
      requestedProvider: providerId,
    });
    _cachedProvider = new LocalProvider();
    _cachedProviderId = 'local';
    return _cachedProvider;
  }

  _cachedProvider = factory(config ?? { providerId: 'local' });
  _cachedProviderId = providerId;

  logger.info('Servicios provider initialized', {
    action: 'servicios_provider_init',
    provider: providerId,
    isLive: _cachedProvider.isLive,
  });

  return _cachedProvider;
}

/**
 * List all available providers with their display info.
 */
export function getAvailableProviders(): Array<{
  id: string;
  name: string;
  status: 'disponible' | 'próximamente';
  description: string;
}> {
  return [
    {
      id: 'local',
      name: 'Local (Sin proveedor)',
      status: 'disponible',
      description: 'Registra recargas y pagos manualmente. El cajero confirma la operación.',
    },
    {
      id: 'turecarga',
      name: 'TuRecarga',
      status: 'disponible',
      description: 'API de recargas electrónicas y pagos de servicios. Requiere cuenta en turecarga.com.',
    },
    {
      id: 'infopago',
      name: 'Infopago',
      status: 'disponible',
      description: 'Plataforma de pagos de servicios, recargas y pines electrónicos.',
    },
    {
      id: 'billpocket',
      name: 'Billpocket',
      status: 'disponible',
      description: 'Solución de cobro con terminal y pagos de servicios integrados.',
    },
  ];
}

/**
 * Reset cached provider. Use when config changes (e.g., user switches provider in settings).
 */
export function resetProvider(): void {
  _cachedProvider = null;
  _cachedProviderId = null;
}
