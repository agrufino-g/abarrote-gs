'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Badge, BlockStack, Box, Button, Divider, InlineStack, Icon, Popover, Scrollable, Text, Thumbnail } from '@shopify/polaris';
import {
  CheckCircleIcon,
  FilterIcon,
  MenuIcon,
  SearchIcon,
  GlobeIcon,
  NotificationIcon,
  ProductIcon,
  OrderIcon,
  FinanceIcon,
  SettingsIcon,
  HomeIcon,
  ImageIcon,
} from '@shopify/polaris-icons';
import Image from 'next/image';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatCurrency } from '@/lib/utils';

interface CustomTopBarProps {
  userMenu: React.ReactNode;
  onNavigationToggle?: () => void;
  onSectionSelect?: (section: string) => void;
  onProductClick?: (product: any) => void;
}

// Quick navigation commands
const QUICK_ACTIONS = [
  { label: 'Inicio', section: 'overview', icon: HomeIcon, keywords: 'inicio dashboard resumen principal' },
  { label: 'Punto de Venta', section: 'sales', icon: OrderIcon, keywords: 'venta cobrar ticket pos punto' },
  { label: 'Inventario', section: 'inventory', icon: ProductIcon, keywords: 'inventario stock productos almacen' },
  { label: 'Productos', section: 'catalog', icon: ProductIcon, keywords: 'catalogo productos lista articulos' },
  { label: 'Historial de Ventas', section: 'sales-history', icon: OrderIcon, keywords: 'historial ventas registros transacciones' },
  { label: 'Gastos', section: 'expenses', icon: FinanceIcon, keywords: 'gastos egresos pagos finanzas' },
  { label: 'Proveedores', section: 'suppliers', icon: FinanceIcon, keywords: 'proveedores distribuidores compras' },
  { label: 'Analíticas', section: 'analytics', icon: FinanceIcon, keywords: 'analiticas reportes estadisticas graficas' },
  { label: 'Configuración', section: 'settings', icon: SettingsIcon, keywords: 'configuracion ajustes preferencias tienda' },
  { label: 'Corte de Caja', section: 'sales-corte', icon: FinanceIcon, keywords: 'corte caja cierre turno' },
];

export function CustomTopBar({ userMenu, onNavigationToggle, onSectionSelect, onProductClick }: CustomTopBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const products = useDashboardStore((s) => s.products);
  const inventoryAlerts = useDashboardStore((s) => s.inventoryAlerts);
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'CMD' : 'CTRL';

  // Filter products by query
  const filteredProducts = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, products]);

  // Filter quick actions by query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS.slice(0, 4);
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keywords.includes(q)
    ).slice(0, 4);
  }, [query]);

  const totalResults = filteredProducts.length + filteredActions.length;
  const showDropdown = isFocused && (query.length >= 1 || isFocused);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsFocused(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    if (isFocused) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isFocused]);

  const formatNotificationTime = useCallback((createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
    return date.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const alertTypeLabel: Record<'low_stock' | 'expiration' | 'expired' | 'merma', string> = {
    low_stock: 'Inventario',
    expiration: 'Caducidad',
    expired: 'Caducado',
    merma: 'Merma',
  };

  const alertSeverityColor: Record<'critical' | 'warning' | 'info', string> = {
    critical: '#d72c0d',
    warning: '#b98900',
    info: '#0a66e2',
  };

  const alertSeverityTone: Record<'critical' | 'warning' | 'info', 'critical' | 'warning' | 'info'> = {
    critical: 'critical',
    warning: 'warning',
    info: 'info',
  };

  const alertHeadingLabel: Record<'low_stock' | 'expiration' | 'expired' | 'merma', string> = {
    low_stock: 'Stock bajo detectado',
    expiration: 'Producto por vencer',
    expired: 'Producto vencido',
    merma: 'Merma registrada',
  };

  const buildAlertDescription = useCallback((alert: typeof inventoryAlerts[number]) => {
    const detail: string[] = [];

    if (alert.product.sku) {
      detail.push(`SKU ${alert.product.sku}`);
    }

    if (alert.alertType === 'low_stock') {
      detail.push(`Stock actual ${alert.product.currentStock}`);
      detail.push(`minimo ${alert.product.minStock}`);
    }

    if ((alert.alertType === 'expiration' || alert.alertType === 'expired') && alert.product.expirationDate) {
      detail.push(`caduca ${new Date(alert.product.expirationDate).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`);
    }

    return `${alert.message}. ${detail.join(' · ')}`;
  }, []);

  const handleSelect = useCallback(
    (type: 'product' | 'action', index: number) => {
      if (type === 'action') {
        const action = filteredActions[index];
        if (action && onSectionSelect) {
          onSectionSelect(action.section);
        }
      } else {
        const product = filteredProducts[index];
        if (product && onProductClick) {
          onProductClick(product);
        }
      }
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [filteredActions, filteredProducts, onSectionSelect, onProductClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, totalResults - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && totalResults > 0) {
        e.preventDefault();
        if (selectedIndex < filteredActions.length) {
          handleSelect('action', selectedIndex);
        } else {
          handleSelect('product', selectedIndex - filteredActions.length);
        }
      }
    },
    [totalResults, selectedIndex, filteredActions.length, handleSelect]
  );

  return (
    <div
      style={{
        height: '56px',
        backgroundColor: '#0b0b0b',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left side: Logo & Mobile Nav Toggle */}
      <InlineStack gap="400" blockAlign="center">
        {onNavigationToggle && (
          <button
            onClick={onNavigationToggle}
            className="mobile-nav-toggle"
            aria-label="Abrir menú"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#e3e5e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon source={MenuIcon} tone="inherit" />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
          <Image
            src="/logo.svg"
            alt="Shopify"
            width={120}
            height={32}
            priority
            style={{ display: 'block', filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </InlineStack>

      {/* Middle: Search Bar */}
      <div ref={dropdownRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: '620px', position: 'relative' }}>
          <div
            style={{
              width: '100%',
              height: '38px',
              background: isFocused
                ? 'linear-gradient(180deg, #30343c 0%, #292d35 100%)'
                : 'linear-gradient(180deg, #2b2f36 0%, #242830 100%)',
              borderRadius: showDropdown && (totalResults > 0 || query.length > 0) ? '12px 12px 0 0' : '12px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              border: `1px solid ${isFocused ? '#5a606a' : '#454b56'}`,
              boxShadow: isFocused
                ? '0 0 0 1px rgba(130, 140, 160, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)'
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              transition: 'all 0.15s ease',
              cursor: 'text',
            }}
            onClick={() => inputRef.current?.focus()}
          >
            <div style={{ color: isFocused ? '#c5ccd6' : '#9ca4b1', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Icon source={SearchIcon} tone="inherit" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e8ebf0',
                padding: '0 10px',
                width: '100%',
                outline: 'none',
                fontSize: '14px',
                lineHeight: '38px',
                height: '38px',
                fontWeight: 500,
                letterSpacing: '0.1px',
              }}
            />
            {!isFocused && (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backgroundColor: '#2f343d',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  color: '#c0c7d2',
                  border: '1px solid #4d5460',
                  flexShrink: 0,
                  lineHeight: '14px',
                  letterSpacing: '0.25px',
                }}
              >
                <span>{shortcutLabel}</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* ── Dropdown Results ── */}
          {showDropdown && (totalResults > 0 || query.length >= 2) && (
            <div
              style={{
                position: 'absolute',
                top: '38px',
                left: 0,
                right: 0,
                backgroundColor: '#1e1e1e',
                border: '1px solid #555',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                maxHeight: '380px',
                overflowY: 'auto',
                zIndex: 999,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Quick actions / sections */}
              {filteredActions.length > 0 && (
                <div>
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {query.length < 2 ? 'Accesos rápidos' : 'Secciones'}
                  </div>
                  {filteredActions.map((action, i) => (
                    <button
                      key={action.section}
                      onClick={() => handleSelect('action', i)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: selectedIndex === i ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: '#e3e5e7',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div style={{ color: '#888', display: 'flex', flexShrink: 0 }}>
                        <Icon source={action.icon} tone="inherit" />
                      </div>
                      <span>{action.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#555' }}>Ir →</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Products */}
              {filteredProducts.length > 0 && (
                <div>
                  {filteredActions.length > 0 && (
                    <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
                  )}
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Productos ({filteredProducts.length})
                  </div>
                  {filteredProducts.map((product, i) => {
                    const resultIndex = filteredActions.length + i;
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelect('product', i)}
                        onMouseEnter={() => setSelectedIndex(resultIndex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: selectedIndex === resultIndex ? 'rgba(255,255,255,0.08)' : 'transparent',
                          color: '#e3e5e7',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '13px',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        <Thumbnail
                          size="small"
                          source={product.imageUrl || ImageIcon}
                          alt={product.name}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {product.sku} · {product.category}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, color: '#7cc' }}>{formatCurrency(product.unitPrice)}</div>
                          <div style={{ fontSize: '11px', color: product.currentStock <= product.minStock ? '#e55' : '#888' }}>
                            Stock: {product.currentStock}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {query.length >= 2 && totalResults === 0 && (
                <div style={{ padding: '20px 12px', textAlign: 'center' }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    No se encontraron resultados para &quot;{query}&quot;
                  </Text>
                </div>
              )}

              {/* Footer hint */}
              <div style={{ padding: '6px 12px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#555', display: 'flex', gap: '12px' }}>
                  <span>↑↓ navegar</span>
                  <span>↵ seleccionar</span>
                  <span>esc cerrar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Icons & User menu */}
      <InlineStack gap="100" blockAlign="center">
        <div style={{ color: '#e3e5e7', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}>
          <Icon source={GlobeIcon} tone="inherit" />
        </div>
        <Popover
          active={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          preferredAlignment="right"
          preferredPosition="below"
          activator={(
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="Abrir alertas"
              style={{
                color: '#f2f4f7',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '1px solid #2f3440',
                borderRadius: '2px',
                backgroundColor: isNotificationsOpen ? '#1a1f26' : '#111418',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                padding: 0,
              }}
            >
              <Icon source={NotificationIcon} tone="inherit" />
              {inventoryAlerts.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#d82c0d',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  border: '2px solid #0b0b0b'
                }}>
                  {inventoryAlerts.length}
                </div>
              )}
            </button>
          )}
        >
          <Box minWidth="360px" maxWidth="360px">
            <BlockStack gap="0">
              <Box padding="400" background="bg-surface">
                <InlineStack align="space-between" blockAlign="start">
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm">Alertas</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {inventoryAlerts.length > 0 ? `${inventoryAlerts.length} activas` : 'Sin alertas'}
                    </Text>
                  </BlockStack>
                  <InlineStack gap="100" blockAlign="center">
                    <Button
                      accessibilityLabel="Filtrar alertas"
                      icon={FilterIcon}
                      size="micro"
                      variant="plain"
                    />
                    <Button
                      accessibilityLabel="Marcar revisadas"
                      icon={CheckCircleIcon}
                      size="micro"
                      variant="plain"
                    />
                  </InlineStack>
                </InlineStack>
              </Box>
              <Divider />

              {inventoryAlerts.length === 0 ? (
                <Box padding="600" background="bg-surface">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="p" variant="headingSm" alignment="center">No hay alertas</Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Cuando se detecten productos con stock bajo, caducidad o mermas, apareceran aqui.
                    </Text>
                  </BlockStack>
                </Box>
              ) : (
                <>
                  <Scrollable shadow style={{ maxHeight: '420px', background: 'var(--p-color-bg-surface)' }}>
                    <BlockStack gap="0">
                      {inventoryAlerts.slice(0, 8).map((alert, index) => (
                        <Box key={alert.id} background="bg-surface">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              onProductClick?.(alert.product);
                            }}
                            style={{
                              width: '100%',
                              padding: '16px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="200" blockAlign="center">
                                  <div
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '999px',
                                      backgroundColor: alertSeverityColor[alert.severity],
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {alertTypeLabel[alert.alertType]} • {formatNotificationTime(alert.createdAt)}
                                  </Text>
                                </InlineStack>
                                <Badge tone={alertSeverityTone[alert.severity]} size="small">
                                  {alert.severity === 'critical' ? 'Urgente' : alert.severity === 'warning' ? 'Atencion' : 'Info'}
                                </Badge>
                              </InlineStack>

                              <BlockStack gap="100">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {alertHeadingLabel[alert.alertType]}
                                </Text>
                                <Text as="p" variant="bodyMd">{alert.product.name}</Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {buildAlertDescription(alert)}
                                </Text>
                              </BlockStack>
                            </BlockStack>
                          </button>
                          {index < Math.min(inventoryAlerts.length, 8) - 1 && <Divider />}
                        </Box>
                      ))}
                    </BlockStack>
                  </Scrollable>

                  <Divider />
                  <Box padding="400" background="bg-surface-secondary">
                    <InlineStack align="center">
                      <Button
                        size="micro"
                        variant="plain"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          onSectionSelect?.('notifications');
                        }}
                      >
                        {inventoryAlerts.length > 8 ? `Ver las ${inventoryAlerts.length} alertas` : 'No hay mas alertas'}
                      </Button>
                    </InlineStack>
                  </Box>
                </>
              )}
            </BlockStack>
          </Box>
        </Popover>
        <div style={{ marginLeft: '8px' }}>
          {userMenu}
        </div>
      </InlineStack>
    </div>
  );
}
