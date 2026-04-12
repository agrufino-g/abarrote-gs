/**
 * Local Provider — No-op adapter for when no external provider is configured.
 *
 * Records transactions locally (as the system does today).
 * All operations succeed immediately with status 'completado'.
 * No actual integration — the cashier confirms the topup/payment was done externally.
 *
 * This is the default provider before a real one (TuRecarga, Infopago, etc.) is connected.
 */

import type { ServiciosProvider, TopupRequest, BillPaymentRequest, ProviderResponse } from '../provider-adapter';

export class LocalProvider implements ServiciosProvider {
  readonly name = 'Local (Sin proveedor)';
  readonly id = 'local';
  readonly isLive = false;

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: true,
      message: 'Modo local activo — las transacciones se registran sin confirmación de proveedor externo.',
    };
  }

  async processTopup(request: TopupRequest): Promise<ProviderResponse> {
    // In local mode, we assume the cashier processed the topup externally
    // (via carrier's terminal, WhatsApp, etc.) and just track it here.
    return {
      accepted: true,
      providerTransactionId: `local-${request.folio}`,
      status: 'completado',
      authorizationCode: request.folio,
    };
  }

  async processBillPayment(request: BillPaymentRequest): Promise<ProviderResponse> {
    // Same as topup — local tracking only.
    return {
      accepted: true,
      providerTransactionId: `local-${request.folio}`,
      status: 'completado',
      authorizationCode: request.folio,
    };
  }

  async queryTransaction(providerTransactionId: string): Promise<ProviderResponse> {
    // Local transactions are always "completed"
    return {
      accepted: true,
      providerTransactionId,
      status: 'completado',
    };
  }
}
