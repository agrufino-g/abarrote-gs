// Mercado Pago Point Integration API
// Docs: https://www.mercadopago.com.mx/developers/es/docs/mp-point/integration-api

export interface MercadoPagoConfig {
  accessToken: string;
  deviceId: string;
  enabled: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  description: string;
  external_reference: string;
  status: 'open' | 'on_terminal' | 'processed' | 'canceled' | 'error' | 'expired';
  payment?: {
    id: number;
    type: string;
    status: string;
    status_detail: string;
  };
}

export interface PaymentIntentRequest {
  amount: number;
  description: string;
  external_reference: string;
  print_on_terminal?: boolean;
}

const MP_API_BASE = 'https://api.mercadopago.com';

/**
 * Crea un intento de cobro en la terminal Mercado Pago Point
 * La terminal mostrará el monto y esperará que se pase la tarjeta
 */
export async function createPaymentIntent(
  config: MercadoPagoConfig,
  request: PaymentIntentRequest
): Promise<PaymentIntent> {
  const response = await fetch(
    `${MP_API_BASE}/point/integration-api/devices/${config.deviceId}/payment-intents`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(request.amount * 100) / 100, // 2 decimales
        description: request.description,
        external_reference: request.external_reference,
        print_on_terminal: request.print_on_terminal ?? true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Error al crear cobro en terminal: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Consulta el estado de un intento de cobro
 */
export async function getPaymentIntentStatus(
  config: MercadoPagoConfig,
  paymentIntentId: string
): Promise<PaymentIntent> {
  const response = await fetch(
    `${MP_API_BASE}/point/integration-api/payment-intents/${paymentIntentId}`,
    {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error al consultar estado: ${response.status}`);
  }

  return response.json();
}

/**
 * Cancela un intento de cobro pendiente en la terminal
 */
export async function cancelPaymentIntent(
  config: MercadoPagoConfig,
  deviceId: string
): Promise<void> {
  const response = await fetch(
    `${MP_API_BASE}/point/integration-api/devices/${deviceId}/payment-intents`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error al cancelar cobro: ${response.status}`);
  }
}

/**
 * Obtiene la lista de dispositivos Point asociados a la cuenta
 */
export async function getDevices(
  accessToken: string
): Promise<{ id: string; operating_mode: string; pos_id: number }[]> {
  const response = await fetch(
    `${MP_API_BASE}/point/integration-api/devices`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error al obtener dispositivos: ${response.status}`);
  }

  const data = await response.json();
  return data.devices || [];
}

/**
 * Obtiene la configuración de MP guardada en localStorage
 */
export function getMPConfig(): MercadoPagoConfig {
  if (typeof window === 'undefined') {
    return { accessToken: '', deviceId: '', enabled: false };
  }
  try {
    const stored = localStorage.getItem('mp_config');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { accessToken: '', deviceId: '', enabled: false };
}

/**
 * Guarda la configuración de MP en localStorage
 */
export function saveMPConfig(config: MercadoPagoConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mp_config', JSON.stringify(config));
}

/**
 * Status labels en español
 */
export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: 'Enviando a terminal...',
    on_terminal: 'Esperando pago en terminal...',
    processed: 'Pago procesado',
    canceled: 'Cobro cancelado',
    error: 'Error en el cobro',
    expired: 'Cobro expirado',
  };
  return labels[status] || status;
}
