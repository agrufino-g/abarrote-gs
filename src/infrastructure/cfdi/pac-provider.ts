/**
 * CFDI PAC Provider Interface
 *
 * Abstraction layer for Proveedor Autorizado de Certificación (PAC).
 * Supports multiple PAC providers: Facturama, SW Sapien, Finkok, etc.
 *
 * Set environment variables to connect:
 *   CFDI_PAC_URL      - PAC API endpoint
 *   CFDI_PAC_USER     - PAC account username
 *   CFDI_PAC_PASSWORD  - PAC account password
 *   CFDI_PAC_PROVIDER  - Provider identifier (default: 'generic')
 */

import { logger } from '@/lib/logger';

// ── Types ──
export interface CfdiEmisor {
  Rfc: string;
  Nombre: string;
  RegimenFiscal: string;
}

export interface CfdiReceptor {
  Rfc: string;
  Nombre: string;
  RegimenFiscalReceptor: string;
  DomicilioFiscalReceptor: string;
  UsoCFDI: string;
}

export interface CfdiConcepto {
  ClaveProdServ: string;
  Cantidad: number;
  ClaveUnidad: string;
  Descripcion: string;
  ValorUnitario: number;
  Importe: number;
  ObjetoImp: string;
  Traslados: {
    Base: number;
    Impuesto: string;
    TipoFactor: string;
    TasaOCuota: number;
    Importe: number;
  }[];
}

export interface CfdiPayload {
  Emisor: CfdiEmisor;
  Receptor: CfdiReceptor;
  Conceptos: CfdiConcepto[];
  Total: number;
  SubTotal: number;
  Moneda: string;
  FormaPago: string;
  MetodoPago: string;
  TipoDeComprobante: string;
}

export interface TimbradoResult {
  uuid: string;
  xmlUrl: string;
  pdfUrl: string;
  fechaTimbrado: string;
}

export interface CancelResult {
  success: boolean;
  acuse?: string;
  message: string;
}

// ── Provider Interface ──
export interface CfdiPacProvider {
  timbrar(payload: CfdiPayload): Promise<TimbradoResult>;
  cancelar(uuid: string, motivo: string, folioSustituto?: string): Promise<CancelResult>;
}

// ── Generic PAC Provider (works with Facturama, SW Sapien, etc.) ──
class GenericPacProvider implements CfdiPacProvider {
  constructor(
    private url: string,
    private user: string,
    private password: string,
  ) {}

  async timbrar(payload: CfdiPayload): Promise<TimbradoResult> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('PAC timbrado failed', { status: response.status, body: body.slice(0, 500) });
      throw new Error(`Error del PAC (HTTP ${response.status})`);
    }

    const result = await response.json();
    return {
      uuid: result.uuid ?? result.UUID ?? result.TimbreFiscalDigital?.UUID ?? '',
      xmlUrl: result.xmlUrl ?? result.xml ?? '',
      pdfUrl: result.pdfUrl ?? result.pdf ?? '',
      fechaTimbrado: result.fechaTimbrado ?? result.FechaTimbrado ?? new Date().toISOString(),
    };
  }

  async cancelar(uuid: string, motivo: string, folioSustituto?: string): Promise<CancelResult> {
    const cancelUrl = `${this.url}/cancel`;
    const response = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`,
      },
      body: JSON.stringify({ uuid, motivo, folioSustituto }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('PAC cancelación failed', { status: response.status, body: body.slice(0, 500) });
      throw new Error(`Error al cancelar en PAC (HTTP ${response.status})`);
    }

    const result = await response.json();
    return {
      success: true,
      acuse: result.acuse ?? result.Acuse ?? '',
      message: 'CFDI cancelado exitosamente',
    };
  }
}

// ── Null provider (no PAC configured) ──
class NullPacProvider implements CfdiPacProvider {
  async timbrar(): Promise<TimbradoResult> {
    logger.warn('PAC not configured — CFDI will be saved locally without timbrado SAT');
    return {
      uuid: 'PAC_NOT_CONFIGURED',
      xmlUrl: '',
      pdfUrl: '',
      fechaTimbrado: '',
    };
  }

  async cancelar(): Promise<CancelResult> {
    return { success: true, message: 'Cancelación local (PAC no configurado)' };
  }
}

// ── Factory ──
let _cachedProvider: CfdiPacProvider | null = null;

export function getPacProvider(): CfdiPacProvider {
  if (_cachedProvider) return _cachedProvider;

  const url = process.env.CFDI_PAC_URL;
  const user = process.env.CFDI_PAC_USER;
  const password = process.env.CFDI_PAC_PASSWORD;

  if (url && user && password) {
    _cachedProvider = new GenericPacProvider(url, user, password);
    logger.info('CFDI PAC provider initialized', { url: url.replace(/\/\/.*@/, '//***@') });
  } else {
    _cachedProvider = new NullPacProvider();
  }

  return _cachedProvider;
}

/** Reset cached provider (useful for testing or config changes) */
export function resetPacProvider(): void {
  _cachedProvider = null;
}
