'use client';

import { useState, useCallback, useEffect } from 'react';
import { Modal, FormLayout, TextField, Banner, Text, BlockStack, Box } from '@shopify/polaris';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { createCashMovement } from '@/app/actions/cash-movement-actions';

interface AperturaCajaModalProps {
  open: boolean;
  onClose: () => void;
}

export function AperturaCajaModal({ open, onClose }: AperturaCajaModalProps) {
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const cashMovements = useDashboardStore((s) => s.cashMovements);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);
  const toast = useToast();

  const [monto, setMonto] = useState(String(storeConfig.defaultStartingFund || '500'));
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if caja was already opened today
  const today = new Date().toISOString().split('T')[0];
  const isAlreadyOpened = cashMovements.some((m) => m.concepto === 'fondo_inicial' && m.fecha.startsWith(today));

  useEffect(() => {
    if (open) {
      setMonto(String(storeConfig.defaultStartingFund || '500'));
    }
  }, [open, storeConfig.defaultStartingFund]);

  const handleOpenCaja = useCallback(async () => {
    const amount = parseFloat(monto);
    if (isNaN(amount) || amount < 0) {
      toast.showError('Ingresa un monto válido');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCashMovement({
        tipo: 'entrada',
        concepto: 'fondo_inicial',
        monto: amount,
        notas: notas || 'Apertura de caja diaria',
        cajero: 'Sistema', // Ideally current user
      });

      toast.showSuccess(`Caja abierta con ${amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`);
      await fetchDashboardData();
      onClose();
    } catch (_error) {
      toast.showError('Error al abrir la caja');
    } finally {
      setIsSubmitting(false);
    }
  }, [monto, notas, toast, fetchDashboardData, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apertura de Caja"
      primaryAction={{
        content: 'Abrir Caja',
        onAction: handleOpenCaja,
        loading: isSubmitting,
        disabled: isAlreadyOpened,
      }}
      secondaryActions={[{ content: 'Cancelar', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {isAlreadyOpened ? (
            <Banner tone="info">
              <p>La caja ya ha sido abierta el día de hoy. No es necesario registrar un nuevo fondo inicial.</p>
            </Banner>
          ) : (
            <Banner tone="warning">
              <p>
                Al abrir la caja, registras el efectivo con el que inicias para dar cambio. Esto se restará del total al
                final del día.
              </p>
            </Banner>
          )}

          <FormLayout>
            <TextField
              label="Monto de apertura (Efectivo en caja)"
              type="number"
              value={monto}
              onChange={setMonto}
              prefix="$"
              autoComplete="off"
              disabled={isAlreadyOpened}
              helpText="Este es el dinero físico que recibes para iniciar el turno."
            />
            <TextField
              label="Notas"
              value={notas}
              onChange={setNotas}
              placeholder="Ej: Recibido de turno matutino"
              autoComplete="off"
              disabled={isAlreadyOpened}
            />
          </FormLayout>

          {!isAlreadyOpened && (
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Fondo predeterminado configurado: <strong>${storeConfig.defaultStartingFund}</strong>. Puedes cambiar
                esto en la sección de configuración.
              </Text>
            </Box>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
