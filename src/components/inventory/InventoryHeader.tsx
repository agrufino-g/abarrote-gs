'use client';

import { useCallback, useState } from 'react';
import {
  ActionList,
  Button,
  Icon,
  InlineStack,
  Popover,
  Text,
} from '@shopify/polaris';
import {
  EmailIcon,
  ExportIcon,
  ImportIcon,
  InventoryIcon,
  ViewIcon,
} from '@shopify/polaris-icons';

interface InventoryHeaderProps {
  onExportClick: () => void;
  onImportClick: () => void;
}

export function InventoryHeader({ onExportClick, onImportClick }: InventoryHeaderProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const toggleActions = useCallback(() => setIsActionsOpen((active) => !active), []);

  return (
    <InlineStack align="space-between" blockAlign="center">
      <InlineStack gap="200" blockAlign="center">
        <Icon source={InventoryIcon} tone="base" />
        <Text as="h2" variant="headingLg" fontWeight="bold">
          Inventario
        </Text>
      </InlineStack>

      <InlineStack gap="200">
        <Button icon={ExportIcon} onClick={onExportClick}>Exportar</Button>
        <Button icon={ImportIcon} onClick={onImportClick}>Importar</Button>
        <Popover
          active={isActionsOpen}
          activator={<Button onClick={toggleActions} disclosure>Más acciones</Button>}
          onClose={toggleActions}
        >
          <ActionList
            actionRole="menuitem"
            items={[
              {
                content: 'Mostrar barra de informes y estadísticas',
                icon: ViewIcon,
              },
              {
                content: 'Crear campaña por correo electrónico',
                icon: EmailIcon,
              },
            ]}
          />
        </Popover>
      </InlineStack>
    </InlineStack>
  );
}
