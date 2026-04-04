'use server';

import { requireOwner } from '@/lib/auth/guard';
import { db } from '@/db';
import { storeConfig } from '@/db/schema';
import { eq, getTableColumns } from 'drizzle-orm';
import type { StoreConfig } from '@/types';
import { DEFAULT_STORE_CONFIG } from '@/types';
import { numVal } from './_helpers';
import { validateSchema, saveStoreConfigSchema } from '@/lib/validation/schemas';

// ==================== STORE CONFIG ====================

/** All valid column keys derived from the Drizzle schema — single source of truth. */
const ALL_DB_COLUMNS = new Set(Object.keys(getTableColumns(storeConfig)));

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code ?? candidate.cause?.code;
}

function getErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '');
  const candidate = error as { message?: string; cause?: { message?: string } };
  return `${candidate.message ?? ''} ${candidate.cause?.message ?? ''}`.trim().toLowerCase();
}

function isUndefinedColumnError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === '42703') return true;

  const text = getErrorText(error);
  return text.includes('does not exist') || text.includes('undefined column');
}

/** Core columns present since the initial migration (safe fallback for un-migrated DBs). */
const CORE_DB_COLUMNS = new Set([
  'storeName', 'legalName', 'address', 'city', 'postalCode', 'phone',
  'rfc', 'regimenFiscal', 'regimenDescription', 'ivaRate', 'pricesIncludeIva',
  'currency', 'lowStockThreshold', 'expirationWarningDays', 'printReceipts',
  'autoBackup', 'ticketFooter', 'ticketServicePhone', 'ticketVigencia',
  'storeNumber', 'ticketBarcodeFormat', 'enableNotifications',
  'telegramToken', 'telegramChatId', 'printerIp', 'cashDrawerPort', 'scalePort',
  'loyaltyEnabled', 'pointsPerPeso', 'pointsValue', 'logoUrl',
]);

function mapStoreConfigRow(
  row: Omit<StoreConfig, 'telegramToken' | 'telegramChatId' | 'printerIp' | 'cashDrawerPort' | 'scalePort' | 'logoUrl' | 'inventoryGeneralColumns' | 'defaultMargin' | 'ticketTemplateVenta' | 'ticketTemplateProveedor' | 'clabeNumber' | 'paypalUsername' | 'cobrarQrUrl' | 'mpDeviceId' | 'mpPublicKey' | 'mpEnabled' | 'closeSystemTime' | 'autoCorteTime' | 'defaultStartingFund'> & {
    telegramToken?: string | null;
    telegramChatId?: string | null;
    printerIp?: string | null;
    cashDrawerPort?: string | null;
    scalePort?: string | null;
    logoUrl?: string | null;
    inventoryGeneralColumns?: string | null;
    defaultMargin?: string | null;
    ticketTemplateVenta?: string | null;
    ticketTemplateProveedor?: string | null;
    clabeNumber?: string | null;
    paypalUsername?: string | null;
    cobrarQrUrl?: string | null;
    mpDeviceId?: string | null;
    mpPublicKey?: string | null;
    mpEnabled?: boolean | null;
    conektaEnabled?: boolean | null;
    conektaPublicKey?: string | null;
    stripeEnabled?: boolean | null;
    stripePublicKey?: string | null;
    clipEnabled?: boolean | null;
    clipApiKey?: string | null;
    clipSerialNumber?: string | null;
    customerDisplayEnabled?: boolean | null;
    customerDisplayWelcome?: string | null;
    customerDisplayFarewell?: string | null;
    customerDisplayPromoText?: string | null;
    customerDisplayPromoImage?: string | null;
    closeSystemTime?: string | null;
    autoCorteTime?: string | null;
    defaultStartingFund?: string | number | null;
    updatedAt?: Date;
  }
): StoreConfig {
  return {
    id: row.id,
    storeName: row.storeName,
    legalName: row.legalName,
    address: row.address,
    city: row.city,
    postalCode: row.postalCode,
    phone: row.phone,
    rfc: row.rfc,
    regimenFiscal: row.regimenFiscal,
    regimenDescription: row.regimenDescription,
    ivaRate: row.ivaRate,
    pricesIncludeIva: row.pricesIncludeIva ?? DEFAULT_STORE_CONFIG.pricesIncludeIva,
    currency: row.currency,
    lowStockThreshold: row.lowStockThreshold,
    expirationWarningDays: row.expirationWarningDays,
    printReceipts: row.printReceipts,
    autoBackup: row.autoBackup,
    ticketFooter: row.ticketFooter,
    ticketServicePhone: row.ticketServicePhone,
    ticketVigencia: row.ticketVigencia,
    storeNumber: row.storeNumber,
    ticketBarcodeFormat: row.ticketBarcodeFormat,
    enableNotifications: row.enableNotifications,
    telegramToken: row.telegramToken ?? undefined,
    telegramChatId: row.telegramChatId ?? undefined,
    printerIp: row.printerIp ?? undefined,
    cashDrawerPort: row.cashDrawerPort ?? undefined,
    scalePort: row.scalePort ?? undefined,
    loyaltyEnabled: row.loyaltyEnabled,
    pointsPerPeso: row.pointsPerPeso,
    pointsValue: row.pointsValue,
    logoUrl: row.logoUrl ?? undefined,
    inventoryGeneralColumns: row.inventoryGeneralColumns ?? DEFAULT_STORE_CONFIG.inventoryGeneralColumns,
    defaultMargin: row.defaultMargin ?? DEFAULT_STORE_CONFIG.defaultMargin,
    ticketTemplateVenta: row.ticketTemplateVenta ?? undefined,
    ticketTemplateProveedor: row.ticketTemplateProveedor ?? undefined,
    clabeNumber: row.clabeNumber ?? undefined,
    paypalUsername: row.paypalUsername ?? undefined,
    cobrarQrUrl: row.cobrarQrUrl ?? undefined,
    mpDeviceId: row.mpDeviceId ?? undefined,
    mpPublicKey: row.mpPublicKey ?? undefined,
    mpEnabled: row.mpEnabled ?? DEFAULT_STORE_CONFIG.mpEnabled,
    conektaEnabled: row.conektaEnabled ?? DEFAULT_STORE_CONFIG.conektaEnabled,
    conektaPublicKey: row.conektaPublicKey ?? undefined,
    stripeEnabled: row.stripeEnabled ?? DEFAULT_STORE_CONFIG.stripeEnabled,
    stripePublicKey: row.stripePublicKey ?? undefined,
    clipEnabled: row.clipEnabled ?? DEFAULT_STORE_CONFIG.clipEnabled,
    clipApiKey: row.clipApiKey ?? undefined,
    clipSerialNumber: row.clipSerialNumber ?? undefined,
    customerDisplayEnabled: row.customerDisplayEnabled ?? DEFAULT_STORE_CONFIG.customerDisplayEnabled,
    customerDisplayWelcome: row.customerDisplayWelcome ?? DEFAULT_STORE_CONFIG.customerDisplayWelcome,
    customerDisplayFarewell: row.customerDisplayFarewell ?? DEFAULT_STORE_CONFIG.customerDisplayFarewell,
    customerDisplayPromoText: row.customerDisplayPromoText ?? DEFAULT_STORE_CONFIG.customerDisplayPromoText,
    customerDisplayPromoImage: row.customerDisplayPromoImage ?? DEFAULT_STORE_CONFIG.customerDisplayPromoImage,
    closeSystemTime: (row.closeSystemTime as string) ?? DEFAULT_STORE_CONFIG.closeSystemTime,
    autoCorteTime: (row.autoCorteTime as string) ?? DEFAULT_STORE_CONFIG.autoCorteTime,
    defaultStartingFund: Number(row.defaultStartingFund) || DEFAULT_STORE_CONFIG.defaultStartingFund,
  };
}

export async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const rows = await db.select().from(storeConfig).limit(1);
    if (rows.length === 0) {
      await db.insert(storeConfig).values({ id: 'main' });
      return DEFAULT_STORE_CONFIG;
    }
    return mapStoreConfigRow(rows[0]);
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;

    // Fallback: select only core columns that are guaranteed to exist
    const rows = await db.select({
      id: storeConfig.id,
      storeName: storeConfig.storeName,
      legalName: storeConfig.legalName,
      address: storeConfig.address,
      city: storeConfig.city,
      postalCode: storeConfig.postalCode,
      phone: storeConfig.phone,
      rfc: storeConfig.rfc,
      regimenFiscal: storeConfig.regimenFiscal,
      regimenDescription: storeConfig.regimenDescription,
      ivaRate: storeConfig.ivaRate,
      pricesIncludeIva: storeConfig.pricesIncludeIva,
      currency: storeConfig.currency,
      lowStockThreshold: storeConfig.lowStockThreshold,
      expirationWarningDays: storeConfig.expirationWarningDays,
      printReceipts: storeConfig.printReceipts,
      autoBackup: storeConfig.autoBackup,
      ticketFooter: storeConfig.ticketFooter,
      ticketServicePhone: storeConfig.ticketServicePhone,
      ticketVigencia: storeConfig.ticketVigencia,
      storeNumber: storeConfig.storeNumber,
      ticketBarcodeFormat: storeConfig.ticketBarcodeFormat,
      enableNotifications: storeConfig.enableNotifications,
      telegramToken: storeConfig.telegramToken,
      telegramChatId: storeConfig.telegramChatId,
      printerIp: storeConfig.printerIp,
      cashDrawerPort: storeConfig.cashDrawerPort,
      scalePort: storeConfig.scalePort,
      loyaltyEnabled: storeConfig.loyaltyEnabled,
      pointsPerPeso: storeConfig.pointsPerPeso,
      pointsValue: storeConfig.pointsValue,
      logoUrl: storeConfig.logoUrl,
    }).from(storeConfig).limit(1);

    if (rows.length === 0) {
      await db.insert(storeConfig).values({ id: 'main' });
      return DEFAULT_STORE_CONFIG;
    }
    return mapStoreConfigRow(rows[0]);
  }
}

export async function saveStoreConfig(data: Partial<StoreConfig>): Promise<StoreConfig> {
  await requireOwner();
  validateSchema(saveStoreConfigSchema, data, 'saveStoreConfig');

  const { id: _id, ...fields } = data;

  /** Build a dbValues object containing only keys present in the given column set. */
  const buildDbValues = (allowedKeys: Set<string>): Record<string, unknown> => {
    const dbValues: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'id' || !allowedKeys.has(key)) continue;
      dbValues[key] = key === 'defaultStartingFund' && value !== undefined
        ? String(value)
        : value;
    }
    return dbValues;
  };

  const persist = async (dbValues: Record<string, unknown>) => {
    const result = await db.update(storeConfig).set(dbValues).where(eq(storeConfig.id, 'main'));
    if (!result.rowCount || result.rowCount === 0) {
      await db.insert(storeConfig).values({ id: 'main', ...dbValues });
    }
  };

  try {
    await persist(buildDbValues(ALL_DB_COLUMNS));
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;
    // Fallback: only use core columns guaranteed to exist since initial migration
    await persist(buildDbValues(CORE_DB_COLUMNS));
  }

  return fetchStoreConfig();
}
