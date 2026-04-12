/**
 * Servicios Provider Adapter — Plug-and-Play Interface
 *
 * Abstraction layer for telecom recharge and bill payment providers.
 * Implement this interface to integrate any provider (TuRecarga, Infopago,
 * Billpocket, Punto Pago, etc.).
 *
 * Current state: LOCAL mode (no provider connected).
 * When a provider is integrated, it replaces the LocalProvider with the real adapter.
 *
 * @example
 * // To add a new provider:
 * // 1. Create src/infrastructure/servicios/providers/tu-recarga.ts
 * // 2. Implement ServiciosProvider interface
 * // 3. Register in provider-registry.ts
 */

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type TransactionStatus =
  | 'pendiente' // Queued, awaiting provider processing
  | 'procesando' // Provider accepted, processing
  | 'completado' // Provider confirmed success
  | 'fallido' // Provider reported failure (refundable)
  | 'cancelado'; // Manually cancelled

export interface TopupRequest {
  /** Carrier ID from catalog (e.g., 'telcel', 'att') */
  carrierId: string;
  /** Phone number (10 digits, no country code) */
  phoneNumber: string;
  /** Amount in MXN */
  amount: number;
  /** Internal folio for tracking */
  folio: string;
}

export interface BillPaymentRequest {
  /** Service ID from catalog (e.g., 'cfe', 'telmex') */
  serviceId: string;
  /** Account/reference number */
  referenceNumber: string;
  /** Amount in MXN */
  amount: number;
  /** Internal folio for tracking */
  folio: string;
}

export interface ProviderResponse {
  /** Whether the provider accepted the request */
  accepted: boolean;
  /** Provider's own transaction ID for reconciliation */
  providerTransactionId?: string;
  /** Current status from provider */
  status: TransactionStatus;
  /** Provider authorization/confirmation code */
  authorizationCode?: string;
  /** Error message if rejected */
  errorMessage?: string;
  /** Error code from provider */
  errorCode?: string;
  /** Estimated completion time (for async providers) */
  estimatedCompletionMs?: number;
}

export interface ProviderBalance {
  /** Available balance for operations (MXN) */
  available: number;
  /** Currency (always MXN for Mexican providers) */
  currency: 'MXN';
  /** Last update time */
  lastUpdated: string;
}

export interface CarrierInfo {
  id: string;
  name: string;
  /** Available recharge amounts, or empty if free-amount */
  availableAmounts: number[];
  /** Minimum amount for free-amount operators */
  minAmount?: number;
  /** Maximum amount */
  maxAmount?: number;
  /** Whether this carrier is currently operational */
  active: boolean;
}

export interface ServiceInfo {
  id: string;
  name: string;
  /** Whether amount is free-form or fixed */
  freeAmount: boolean;
  /** Minimum payment amount */
  minAmount: number;
  /** Maximum payment amount */
  maxAmount: number;
  /** Whether this service is currently operational */
  active: boolean;
}

// ══════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ══════════════════════════════════════════════════════════════

export interface ServiciosProvider {
  /** Provider display name */
  readonly name: string;

  /** Provider identifier (e.g., 'turecarga', 'infopago', 'local') */
  readonly id: string;

  /** Whether this is a real provider or local-only tracking */
  readonly isLive: boolean;

  // ── Capabilities ──

  /** Check if provider is configured and operational */
  healthCheck(): Promise<{ ok: boolean; message?: string }>;

  /** Get current balance with provider (for prepaid models) */
  getBalance?(): Promise<ProviderBalance>;

  /** Get available carriers from the provider's live catalog */
  getCarriers?(): Promise<CarrierInfo[]>;

  /** Get available bill payment services from provider */
  getServices?(): Promise<ServiceInfo[]>;

  // ── Operations ──

  /** Process a phone topup/recharge */
  processTopup(request: TopupRequest): Promise<ProviderResponse>;

  /** Process a bill/service payment */
  processBillPayment(request: BillPaymentRequest): Promise<ProviderResponse>;

  /** Query the status of a transaction by provider ID */
  queryTransaction(providerTransactionId: string): Promise<ProviderResponse>;

  /** Cancel/reverse a transaction if possible */
  cancelTransaction?(providerTransactionId: string): Promise<ProviderResponse>;

  // ── Webhook ──

  /** Verify webhook signature from provider */
  verifyWebhook?(headers: Headers, body: string): Promise<boolean>;

  /** Parse webhook payload into a normalized status update */
  parseWebhook?(body: string): Promise<{
    providerTransactionId: string;
    status: TransactionStatus;
    authorizationCode?: string;
    errorMessage?: string;
  }>;
}

// ══════════════════════════════════════════════════════════════
// PHONE NUMBER VALIDATION
// ══════════════════════════════════════════════════════════════

/**
 * Validate and normalize a Mexican phone number.
 * Accepts: 5512345678, 55 1234 5678, +52 55 1234 5678, 044 55 1234 5678
 * Returns: 10-digit normalized number or null if invalid.
 */
export function normalizePhoneNumber(raw: string): string | null {
  // Strip all non-digits
  const digits = raw.replace(/\D/g, '');

  // Handle country code prefix
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    return digits.slice(3);
  }
  // Handle old 044 prefix
  if (digits.length === 13 && digits.startsWith('044')) {
    return digits.slice(3);
  }
  // Standard 10-digit
  if (digits.length === 10) {
    return digits;
  }

  return null;
}

/**
 * Validate that a phone number belongs to a valid Mexican area code range.
 * Basic validation — checks LADA (area code) prefix.
 */
export function isValidMexicanPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;

  // Mexican mobile numbers: first 2-3 digits are LADA
  // Valid LADAs: 55 (CDMX), 33 (GDL), 81 (MTY), etc.
  // All 10-digit numbers starting with 1-9 are valid format
  const firstDigit = normalized[0];
  return firstDigit >= '1' && firstDigit <= '9';
}

/**
 * Validate a service reference number format.
 * Rules vary by service:
 *  - CFE: 12 digits (número de servicio)
 *  - Telmex: 10 digits
 *  - General: at least 5 alphanumeric characters
 */
export function validateReferenceNumber(serviceId: string, reference: string): { valid: boolean; reason?: string } {
  const clean = reference.trim();

  if (!clean || clean.length < 5) {
    return { valid: false, reason: 'El número de referencia debe tener al menos 5 caracteres' };
  }

  switch (serviceId) {
    case 'cfe':
      if (!/^\d{12}$/.test(clean)) {
        return { valid: false, reason: 'CFE requiere 12 dígitos (número de servicio)' };
      }
      break;
    case 'telmex':
      if (!/^\d{10}$/.test(clean)) {
        return { valid: false, reason: 'Telmex requiere 10 dígitos (número de teléfono fijo)' };
      }
      break;
    case 'agua':
      if (clean.length < 6) {
        return { valid: false, reason: 'Número de cuenta de agua: mínimo 6 caracteres' };
      }
      break;
    default:
      // Generic validation: alphanumeric, 5-30 chars
      if (!/^[a-zA-Z0-9\-]{5,30}$/.test(clean)) {
        return { valid: false, reason: 'Formato de referencia inválido (5-30 caracteres alfanuméricos)' };
      }
  }

  return { valid: true };
}
