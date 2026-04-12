'use client';

import { useState, useCallback } from 'react';
import { Popover, ActionList, Icon, InlineStack, Text, Box } from '@shopify/polaris';
import { StoreIcon, PlusCircleIcon, CheckSmallIcon } from '@shopify/polaris-icons';
import { useDashboardStore } from '@/store/dashboardStore';

export interface StoreInfo {
  id: string;
  name: string;
}

export function StoreSelector() {
  const [active, setActive] = useState(false);
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const activeStoreId = useDashboardStore((s) => s.activeStoreId);
  const stores = useDashboardStore((s) => s.stores);
  const switchStore = useDashboardStore((s) => s.switchStore);

  const toggleActive = useCallback(() => setActive((p) => !p), []);

  const handleSelect = useCallback(
    (storeId: string) => {
      switchStore(storeId);
      setActive(false);
    },
    [switchStore],
  );

  const currentStoreName = stores.find((s) => s.id === activeStoreId)?.name || storeConfig.storeName;

  // If only one store, show it as static label
  if (stores.length <= 1) {
    return (
      <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockStart="300" paddingBlockEnd="300">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={StoreIcon} tone="base" />
          <Text as="span" variant="bodySm" fontWeight="semibold" truncate>
            {currentStoreName}
          </Text>
        </InlineStack>
      </Box>
    );
  }

  const activator = (
    <div style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={toggleActive}>
      <InlineStack gap="200" blockAlign="center">
        <Icon source={StoreIcon} tone="base" />
        <Text as="span" variant="bodySm" fontWeight="semibold" truncate>
          {currentStoreName}
        </Text>
        <span style={{ fontSize: '10px', color: '#6d7175' }}>▼</span>
      </InlineStack>
    </div>
  );

  return (
    <Popover active={active} activator={activator} onClose={() => setActive(false)} preferredAlignment="left">
      <ActionList
        items={[
          ...stores.map((store) => ({
            content: store.name,
            prefix: store.id === activeStoreId ? <Icon source={CheckSmallIcon} tone="success" /> : undefined,
            onAction: () => handleSelect(store.id),
            active: store.id === activeStoreId,
          })),
          {
            content: 'Agregar sucursal',
            prefix: <Icon source={PlusCircleIcon} />,
            disabled: true,
            helpText: 'Próximamente',
          },
        ]}
      />
    </Popover>
  );
}
