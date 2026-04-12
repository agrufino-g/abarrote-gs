import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getMPConfigFromStore,
  createPaymentIntent,
  getPaymentIntentStatus,
  cancelPaymentIntent,
  getPaymentStatusLabel,
} from '@/lib/mercadopago';
import type { MercadoPagoConfig, PaymentIntent } from '@/lib/mercadopago';
import type { SaleItem, SaleRecord } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { formatCurrency } from '@/lib/utils';

export interface UseMercadoPagoTerminalParams {
  total: number;
  items: SaleItem[];
  subtotal: number;
  iva: number;
  cardSurcharge: number;
  open: boolean;
  onSaleComplete: (sale: SaleRecord) => void;
}

export function useMercadoPagoTerminal({
  total,
  items,
  subtotal,
  iva,
  cardSurcharge,
  open,
  onSaleComplete,
}: UseMercadoPagoTerminalParams) {
  const registerSale = useDashboardStore((s) => s.registerSale);
  const currentUserRole = useDashboardStore((s) => s.currentUserRole);
  const { showSuccess, showError } = useToast();

  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>({ deviceId: '', enabled: false });
  const [mpProcessing, setMpProcessing] = useState(false);
  const [mpStatus, setMpStatus] = useState('');
  const [_mpPaymentIntent, setMpPaymentIntent] = useState<PaymentIntent | null>(null);
  const [mpError, setMpError] = useState('');
  const mpPollingRef = useRef<NodeJS.Timeout | null>(null);
  const mpPollCountRef = useRef(0);
  const handleMPTerminalPaymentRef = useRef<(() => Promise<void>) | null>(null);
  const [mpWebSuccess, setMpWebSuccess] = useState(false);
  const [mpPollProgress, setMpPollProgress] = useState(0);

  const MP_MAX_POLL_ATTEMPTS = 60; // 60 × 3s = 3 min timeout
  const MP_POLL_INTERVAL_MS = 3000;

  // Keep a stable ref to the callback so the polling closure always has the latest
  const onSaleCompleteRef = useRef(onSaleComplete);
  useEffect(() => {
    onSaleCompleteRef.current = onSaleComplete;
  }, [onSaleComplete]);

  // Load MP config from storeConfig (DB-backed)
  /* eslint-disable react-hooks/set-state-in-effect -- external store sync */
  useEffect(() => {
    const storeConfigData = useDashboardStore.getState().storeConfig;
    const config = getMPConfigFromStore(storeConfigData);
    setMpConfig(config);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMPTerminalPayment = useCallback(async () => {
    if (!mpConfig.enabled || !mpConfig.deviceId) {
      showError('Configura tu terminal Mercado Pago en Configuración antes de cobrar con tarjeta');
      return;
    }

    setMpProcessing(true);
    setMpError('');
    setMpStatus('Enviando cobro a la terminal...');

    try {
      const intent = await createPaymentIntent(mpConfig, {
        amount: total,
        description: `Venta - ${items.length} producto(s)`,
        external_reference: `venta-${Date.now()}`,
        print_on_terminal: true,
      });

      setMpPaymentIntent(intent);
      setMpStatus('Esperando pago en la terminal...');
      mpPollCountRef.current = 0;
      setMpPollProgress(0);

      mpPollingRef.current = setInterval(async () => {
        mpPollCountRef.current += 1;
        setMpPollProgress(Math.min(Math.round((mpPollCountRef.current / MP_MAX_POLL_ATTEMPTS) * 100), 100));

        // Timeout — max polling reached
        if (mpPollCountRef.current >= MP_MAX_POLL_ATTEMPTS) {
          if (mpPollingRef.current) clearInterval(mpPollingRef.current);
          setMpProcessing(false);
          setMpError('Tiempo de espera agotado (3 min). Cancela e intenta de nuevo.');
          return;
        }

        try {
          const status = await getPaymentIntentStatus(mpConfig, intent.id);
          setMpStatus(getPaymentStatusLabel(status.status));

          if (status.status === 'processed') {
            if (mpPollingRef.current) clearInterval(mpPollingRef.current);
            setMpProcessing(false);

            const sale = await registerSale({
              items,
              subtotal,
              iva,
              cardSurcharge,
              total,
              paymentMethod: 'tarjeta',
              amountPaid: total,
              change: 0,
              cajero:
                currentUserRole?.globalId ||
                currentUserRole?.employeeNumber ||
                currentUserRole?.displayName ||
                'Cajero',
              pointsEarned: 0,
              pointsUsed: 0,
              discount: 0,
              discountType: 'amount',
              installments: 1,
              mpPaymentId: intent.id,
              status: 'completada',
            });
            onSaleCompleteRef.current(sale);
            showSuccess(`Pago con tarjeta procesado. Venta ${sale.folio}: ${formatCurrency(sale.total)}`);
          } else if (status.status === 'canceled' || status.status === 'error' || status.status === 'expired') {
            if (mpPollingRef.current) clearInterval(mpPollingRef.current);
            setMpProcessing(false);
            setMpError(
              `Cobro ${status.status === 'canceled' ? 'cancelado' : status.status === 'expired' ? 'expirado' : 'con error'}. Intenta de nuevo.`,
            );
          }
        } catch {
          // Network error during polling — keep trying (count still increments)
        }
      }, MP_POLL_INTERVAL_MS);
    } catch (err) {
      setMpProcessing(false);
      setMpError(err instanceof Error ? err.message : 'Error al conectar con la terminal');
    }
  }, [mpConfig, total, items, subtotal, iva, cardSurcharge, currentUserRole, registerSale, showSuccess, showError]);

  const handleCancelMPPayment = useCallback(async () => {
    if (mpPollingRef.current) {
      clearInterval(mpPollingRef.current);
      mpPollingRef.current = null;
    }
    try {
      await cancelPaymentIntent(mpConfig, mpConfig.deviceId);
      showSuccess('Cobro cancelado en la terminal');
    } catch {
      // Terminal may have already processed/canceled
    }
    setMpProcessing(false);
    setMpStatus('');
    setMpPaymentIntent(null);
  }, [mpConfig, showSuccess]);

  // Assign ref so parent can trigger from handleSale
  useEffect(() => {
    handleMPTerminalPaymentRef.current = handleMPTerminalPayment;
  }, [handleMPTerminalPayment]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (mpPollingRef.current) clearInterval(mpPollingRef.current);
    };
  }, []);

  const resetMpState = useCallback(() => {
    setMpProcessing(false);
    setMpStatus('');
    setMpPaymentIntent(null);
    setMpError('');
    setMpWebSuccess(false);
    setMpPollProgress(0);
    mpPollCountRef.current = 0;
    if (mpPollingRef.current) {
      clearInterval(mpPollingRef.current);
      mpPollingRef.current = null;
    }
  }, []);

  return {
    mpConfig,
    mpProcessing,
    mpStatus,
    mpError,
    mpWebSuccess,
    mpPollProgress,
    setMpWebSuccess,
    handleMPTerminalPaymentRef,
    handleCancelMPPayment,
    resetMpState,
  };
}
