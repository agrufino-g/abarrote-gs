'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  SkeletonBodyText,
  Box,
} from '@shopify/polaris';

export interface SettingsToggleCardProps {
  /** Main title of the setting */
  title: string;
  /** Description text shown below title */
  description?: string;
  /** Current enabled state */
  enabled: boolean;
  /** Label shown on the toggle button when enabled */
  enabledLabel?: string;
  /** Label shown on the toggle button when disabled */
  disabledLabel?: string;
  /** Async function to persist the new state. Throw to trigger rollback. */
  onToggle: (newValue: boolean) => Promise<void>;
  /** Optional children to render below the toggle (only when enabled) */
  children?: React.ReactNode;
  /** Show loading skeleton instead of content */
  loading?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Help text shown below the toggle */
  helpText?: string;
}

/**
 * A reusable settings toggle card with optimistic updates and automatic rollback.
 * 
 * Features:
 * - Instant UI toggle (optimistic)
 * - Shows loading state during save
 * - Automatically reverts if `onToggle` throws
 * - Supports conditional children (shown only when enabled)
 * 
 * @example
 * ```tsx
 * <SettingsToggleCard
 *   title="Customer Display"
 *   description="Show items to customers on a second screen."
 *   enabled={config.customerDisplayEnabled}
 *   onToggle={async (val) => {
 *     await saveStoreConfig({ customerDisplayEnabled: val });
 *   }}
 * >
 *   <TextField ... />
 * </SettingsToggleCard>
 * ```
 */
export function SettingsToggleCard({
  title,
  description,
  enabled,
  enabledLabel = 'Activado',
  disabledLabel = 'Desactivado',
  onToggle,
  children,
  loading = false,
  disabled = false,
  helpText,
}: SettingsToggleCardProps) {
  // Optimistic local state: tracks UI value before server confirms
  const [optimisticEnabled, setOptimisticEnabled] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);
  const lastServerValue = useRef(enabled);

  // Sync optimistic state when prop changes (e.g., external refresh)
  // Using useEffect instead of inline condition to follow React best practices
  useEffect(() => {
    if (lastServerValue.current !== enabled && !isSaving) {
      lastServerValue.current = enabled;
      setOptimisticEnabled(enabled);
    }
  }, [enabled, isSaving]);

  const handleToggle = useCallback(async () => {
    if (isSaving || disabled) return;

    const newValue = !optimisticEnabled;
    const previousValue = optimisticEnabled;

    // Optimistic update
    setOptimisticEnabled(newValue);
    setIsSaving(true);

    try {
      await onToggle(newValue);
      // Success: update server reference
      lastServerValue.current = newValue;
    } catch {
      // Rollback on error
      setOptimisticEnabled(previousValue);
    } finally {
      setIsSaving(false);
    }
  }, [optimisticEnabled, isSaving, disabled, onToggle]);

  if (loading) {
    return (
      <Card>
        <BlockStack gap="400">
          <SkeletonBodyText lines={2} />
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <BlockStack gap="100">
            <Text variant="headingSm" as="h3">
              {title}
            </Text>
            {description && (
              <Text variant="bodySm" as="p" tone="subdued">
                {description}
              </Text>
            )}
          </BlockStack>
          <Box minWidth="120px">
            <Button
              role="switch"
              ariaChecked={optimisticEnabled}
              onClick={handleToggle}
              loading={isSaving}
              disabled={disabled || isSaving}
              variant={optimisticEnabled ? 'primary' : undefined}
              size="slim"
              fullWidth
              accessibilityLabel={
                optimisticEnabled
                  ? `Desactivar ${title.toLowerCase()}`
                  : `Activar ${title.toLowerCase()}`
              }
            >
              {optimisticEnabled ? enabledLabel : disabledLabel}
            </Button>
          </Box>
        </InlineStack>

        {helpText && !optimisticEnabled && (
          <Text as="p" variant="bodySm" tone="subdued">
            {helpText}
          </Text>
        )}

        {/* Conditional children with enter animation would go here */}
        {optimisticEnabled && children && (
          <Box paddingBlockStart="200">{children}</Box>
        )}
      </BlockStack>
    </Card>
  );
}
