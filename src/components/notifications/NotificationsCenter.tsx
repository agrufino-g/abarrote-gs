'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  Icon,
  IndexTable,
  InlineGrid,
  InlineStack,
  ProgressBar,
  Select,
  Tabs,
  Text,
  TextField,
  Tooltip,
} from '@shopify/polaris';
import { SearchIcon, SettingsIcon } from '@shopify/polaris-icons';
import type { InventoryAlert, Product, StoreConfig } from '@/types';

interface NotificationsCenterProps {
  alerts: InventoryAlert[];
  storeConfig: StoreConfig;
  onProductClick?: (product: Product) => void;
  onOpenSettings?: () => void;
}

type TypeFilter = 'all' | InventoryAlert['alertType'];

const TYPE_LABELS: Record<InventoryAlert['alertType'], string> = {
  low_stock: 'Stock bajo',
  expiration: 'Por vencer',
  expired: 'Vencido',
  merma: 'Merma',
};

const SEVERITY_ORDER: Record<InventoryAlert['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '–';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function StockBar({ current, minimum, severity }: {
  current: number;
  minimum: number;
  severity: InventoryAlert['severity'];
}) {
  const ratio = minimum > 0 ? Math.min(Math.round((current / minimum) * 100), 100) : 100;
  const tone = severity === 'critical' ? 'critical' : severity === 'warning' ? 'highlight' : 'success';
  return (
    <InlineStack gap="150" blockAlign="center" wrap={false}>
      <div style={{ width: 80 }}>
        <ProgressBar size="small" tone={tone} progress={ratio} />
      </div>
      <Text as="span" variant="bodyXs" tone="subdued">{current}/{minimum}</Text>
    </InlineStack>
  );
}

function MetricCard({ label, value, accentColor, subtitle, extra }: {
  label: string;
  value: number | string;
  accentColor: string;
  subtitle?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minHeight: 72 }}>
        <div style={{
          width: 4,
          alignSelf: 'stretch',
          minHeight: 52,
          borderRadius: 4,
          backgroundColor: accentColor,
          flexShrink: 0,
        }} />
        <BlockStack gap="100">
          <Text as="p" variant="heading3xl">{value}</Text>
          <Text as="p" variant="bodySm" fontWeight="medium">{label}</Text>
          {subtitle && <Text as="p" variant="bodyXs" tone="subdued">{subtitle}</Text>}
          {extra}
        </BlockStack>
      </div>
    </Card>
  );
}

export function NotificationsCenter({
  alerts,
  storeConfig,
  onProductClick,
  onOpenSettings,
}: NotificationsCenterProps) {
  const [queryValue, setQueryValue] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const counts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }), [alerts]);

  const tabs = useMemo(() => [
    { id: 'all', content: `Todas (${counts.all})`, panelID: 'panel-all' },
    { id: 'critical', content: `Críticas (${counts.critical})`, panelID: 'panel-critical' },
    { id: 'warning', content: `Advertencias (${counts.warning})`, panelID: 'panel-warning' },
    { id: 'info', content: `Info (${counts.info})`, panelID: 'panel-info' },
  ], [counts]);

  const severityFromTab = useMemo<'all' | InventoryAlert['severity']>(() => {
    const map = ['all', 'critical', 'warning', 'info'] as const;
    return map[selectedTab];
  }, [selectedTab]);

  const filteredAlerts = useMemo(() => {
    const q = queryValue.trim().toLowerCase();
    return alerts
      .filter((alert) => {
        if (severityFromTab !== 'all' && alert.severity !== severityFromTab) return false;
        if (typeFilter !== 'all' && alert.alertType !== typeFilter) return false;
        if (!q) return true;
        return [
          alert.product.name,
          alert.product.sku,
          alert.product.category,
          alert.message,
          TYPE_LABELS[alert.alertType],
        ].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [alerts, severityFromTab, typeFilter, queryValue]);

  const isConnected = !!(
    storeConfig.enableNotifications &&
    storeConfig.telegramToken &&
    storeConfig.telegramChatId
  );

  const rowMarkup = filteredAlerts.map((alert, index) => {
    const badgeTone = alert.severity === 'critical'
      ? 'critical'
      : alert.severity === 'warning'
      ? 'warning'
      : 'info';
    const rowTone = alert.severity === 'critical'
      ? 'critical'
      : alert.severity === 'warning'
      ? 'caution'
      : undefined;

    return (
      <IndexTable.Row id={alert.id} key={alert.id} position={index} tone={rowTone}>
        {/* Severity indicator */}
        <IndexTable.Cell>
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <div
              className={
                alert.severity === 'critical'
                  ? 'notif-pulse-dot--critical'
                  : alert.severity === 'warning'
                  ? 'notif-pulse-dot--warning'
                  : 'notif-pulse-dot--info'
              }
              style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }}
            />
            <Badge tone={badgeTone as any}>
              {alert.severity === 'critical' ? 'Crítica' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
            </Badge>
          </InlineStack>
        </IndexTable.Cell>

        {/* Product name + meta */}
        <IndexTable.Cell>
          <BlockStack gap="050">
            <Button variant="plain" onClick={() => onProductClick?.(alert.product)}>
              {alert.product.name}
            </Button>
            <InlineStack gap="100" wrap>
              {alert.product.category && (
                <Text as="span" variant="bodyXs" tone="subdued">{alert.product.category}</Text>
              )}
              {alert.product.sku && (
                <Text as="span" variant="bodyXs" tone="subdued">· SKU {alert.product.sku}</Text>
              )}
            </InlineStack>
          </BlockStack>
        </IndexTable.Cell>

        {/* Alert type */}
        <IndexTable.Cell>
          <Badge>{TYPE_LABELS[alert.alertType]}</Badge>
        </IndexTable.Cell>

        {/* Stock level bar */}
        <IndexTable.Cell>
          <StockBar
            current={alert.product.currentStock}
            minimum={alert.product.minStock}
            severity={alert.severity}
          />
        </IndexTable.Cell>

        {/* Message */}
        <IndexTable.Cell>
          <Text as="span" variant="bodySm" tone="subdued">{alert.message}</Text>
        </IndexTable.Cell>

        {/* Relative time */}
        <IndexTable.Cell>
          <Tooltip content={new Date(alert.createdAt).toLocaleString('es-MX')}>
            <Text as="span" variant="bodyXs" tone="subdued">{getRelativeTime(alert.createdAt)}</Text>
          </Tooltip>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <BlockStack gap="400">
      {/* ── Live header card ── */}
      <Card>
        <InlineStack align="space-between" blockAlign="center" wrap>
          <InlineStack gap="300" blockAlign="center">
            <div className="notif-live-dot" />
            <BlockStack gap="025">
              <Text as="h1" variant="headingLg" fontWeight="bold">Centro de alertas</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Monitoreo operativo en tiempo real · inventario, vencimientos y mermas
              </Text>
            </BlockStack>
          </InlineStack>
          <Button icon={SettingsIcon} onClick={onOpenSettings}>
            Configurar canal
          </Button>
        </InlineStack>
      </Card>

      {/* ── Metric cards ── */}
      <InlineGrid columns={{ xs: 2, sm: 2, md: 4 }} gap="300">
        <MetricCard
          label="Alertas activas"
          value={counts.all}
          accentColor="#5C6AC4"
          subtitle={counts.all === 0 ? 'Sistema al día' : 'Requieren atención'}
        />
        <MetricCard
          label="Críticas"
          value={counts.critical}
          accentColor="#E31212"
          subtitle={counts.critical > 0 ? 'Acción inmediata' : 'Sin urgencias'}
        />
        <MetricCard
          label="Advertencias"
          value={counts.warning}
          accentColor="#B98900"
          subtitle="Requieren revisión"
        />
        <MetricCard
          label="Canal externo"
          value={isConnected ? 'Activo' : 'Sin config.'}
          accentColor={isConnected ? '#008060' : '#B98900'}
          subtitle={isConnected ? 'Telegram configurado' : 'Sin alertas externas'}
          extra={
            <Badge tone={isConnected ? 'success' : 'warning'}>
              {isConnected ? 'Conectado' : 'Pendiente'}
            </Badge>
          }
        />
      </InlineGrid>

      {/* ── Main alerts table ── */}
      <Card padding="0">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          {/* Toolbar */}
          <Box padding="400" paddingBlockEnd="300">
            <InlineStack gap="300" wrap>
              <div style={{ flex: 2, minWidth: 240 }}>
                <TextField
                  label="Buscar"
                  labelHidden
                  autoComplete="off"
                  value={queryValue}
                  onChange={setQueryValue}
                  prefix={<Icon source={SearchIcon} tone="subdued" /> as any}
                  placeholder="Buscar por producto, SKU, categoría o mensaje…"
                  clearButton
                  onClearButtonClick={() => setQueryValue('')}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Select
                  label="Tipo"
                  labelHidden
                  options={[
                    { label: 'Todos los tipos', value: 'all' },
                    { label: 'Stock bajo', value: 'low_stock' },
                    { label: 'Por vencer', value: 'expiration' },
                    { label: 'Vencido', value: 'expired' },
                    { label: 'Merma', value: 'merma' },
                  ]}
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v as TypeFilter)}
                />
              </div>
            </InlineStack>
          </Box>

          {/* Telegram warning banner */}
          {!isConnected && (
            <Box paddingInline="400" paddingBlockEnd="300">
              <Banner tone="warning" title="Canal externo no configurado">
                <p>Las alertas críticas no se enviarán a supervisión. Configura Telegram para recibir avisos en tiempo real.</p>
              </Banner>
            </Box>
          )}

          {/* Empty state */}
          {filteredAlerts.length === 0 ? (
            <Box padding="600">
              <EmptyState
                heading={alerts.length === 0 ? '¡Todo en orden!' : 'Sin resultados para este filtro'}
                image=""
              >
                <p>
                  {alerts.length === 0
                    ? 'No hay alertas activas. El inventario está dentro de los parámetros normales.'
                    : 'Ajusta la búsqueda o el tipo de alerta para ver otros resultados.'}
                </p>
              </EmptyState>
            </Box>
          ) : (
            <IndexTable
              resourceName={{ singular: 'alerta', plural: 'alertas' }}
              itemCount={filteredAlerts.length}
              selectable={false}
              headings={[
                { title: 'Severidad' },
                { title: 'Producto' },
                { title: 'Tipo' },
                { title: 'Nivel de stock' },
                { title: 'Mensaje' },
                { title: 'Tiempo' },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          )}
        </Tabs>
      </Card>
    </BlockStack>
  );
}