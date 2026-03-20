'use client';

import {
  Modal,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Box,
  Banner,
} from '@shopify/polaris';
import type { RoleDefinition } from '@/types';
import { PERMISSION_LABELS, PERMISSION_GROUPS } from '@/types';

interface PermissionsDetailModalProps {
  open: boolean;
  onClose: () => void;
  roleDef: RoleDefinition | null;
}

export function PermissionsDetailModal({
  open,
  onClose,
  roleDef,
}: PermissionsDetailModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Permisos: ${roleDef?.name ?? ''}`}
      secondaryActions={[{ content: 'Cerrar', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="300">
          {roleDef && (
            <>
              <Banner tone="info">
                <p>{roleDef.description}</p>
              </Banner>
              <Text variant="headingSm" as="h3">
                {roleDef.permissions.length} permisos activos
              </Text>
              <Divider />
              {PERMISSION_GROUPS.map((group) => {
                const active = group.permissions.filter((p) =>
                  roleDef.permissions.includes(p)
                );
                return (
                  <Box key={group.title}>
                    <BlockStack gap="100">
                      <Text variant="headingSm" as="h4">{group.title}</Text>
                      {active.length === 0 ? (
                        <Text variant="bodySm" as="p" tone="subdued">Sin acceso</Text>
                      ) : (
                        <InlineStack gap="200" wrap>
                          {group.permissions.map((perm) => {
                            const has = roleDef.permissions.includes(perm);
                            return (
                              <Badge key={perm} tone={has ? 'success' : undefined}>
                                {PERMISSION_LABELS[perm]}
                              </Badge>
                            );
                          })}
                        </InlineStack>
                      )}
                    </BlockStack>
                  </Box>
                );
              })}
            </>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
