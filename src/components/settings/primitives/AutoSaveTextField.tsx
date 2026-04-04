'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TextField, InlineStack, Spinner, Icon, Box, Tooltip } from '@shopify/polaris';
import { CheckCircleIcon, AlertCircleIcon } from '@shopify/polaris-icons';
import type { TextFieldProps } from '@shopify/polaris';

export interface AutoSaveTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  /** Current persisted value */
  value: string;
  /** Async function to persist the new value. Throw to indicate error. */
  onSave: (newValue: string) => Promise<void>;
  /** Debounce delay in ms before auto-saving (default: 800) */
  debounceMs?: number;
  /** Show inline save indicator */
  showSaveIndicator?: boolean;
  /** Success message for tooltip */
  successMessage?: string;
  /** Error message for tooltip */
  errorMessage?: string;
}

type SaveState = 'idle' | 'typing' | 'saving' | 'saved' | 'error';

/**
 * A TextField that automatically saves its value after a debounce period.
 *
 * Features:
 * - Inline save status indicator (spinner, checkmark, error)
 * - Debounced auto-save to reduce server calls
 * - Tracks last-saved value to avoid redundant saves
 * - Works well in forms without needing a submit button
 *
 * @example
 * ```tsx
 * <AutoSaveTextField
 *   label="Welcome Message"
 *   value={config.welcomeMessage}
 *   onSave={async (v) => {
 *     await saveStoreConfig({ welcomeMessage: v });
 *   }}
 * />
 * ```
 */
export function AutoSaveTextField({
  value,
  onSave,
  debounceMs = 800,
  showSaveIndicator = true,
  successMessage = 'Guardado',
  errorMessage = 'Error al guardar',
  ...textFieldProps
}: AutoSaveTextFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSavedValue = useRef(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Sync local value when prop changes externally (e.g., store refresh)
  useEffect(() => {
    if (value !== lastSavedValue.current) {
      lastSavedValue.current = value;
      setLocalValue(value);
    }
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const performSave = useCallback(
    async (valueToSave: string) => {
      // Skip if value hasn't changed from last saved
      if (valueToSave === lastSavedValue.current) {
        setSaveState('idle');
        return;
      }

      setSaveState('saving');
      try {
        await onSave(valueToSave);
        if (isMounted.current) {
          lastSavedValue.current = valueToSave;
          setSaveState('saved');
          // Reset to idle after showing success
          setTimeout(() => {
            if (isMounted.current) setSaveState('idle');
          }, 2000);
        }
      } catch {
        if (isMounted.current) {
          setSaveState('error');
          // Reset to idle after showing error
          setTimeout(() => {
            if (isMounted.current) setSaveState('idle');
          }, 3000);
        }
      }
    },
    [onSave],
  );

  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      setSaveState('typing');

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new debounce timer
      debounceTimer.current = setTimeout(() => {
        performSave(newValue);
      }, debounceMs);
    },
    [debounceMs, performSave],
  );

  // Handle blur: save immediately if there are pending changes
  const handleBlur = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (localValue !== lastSavedValue.current) {
      performSave(localValue);
    }
  }, [localValue, performSave]);

  // Render save state indicator
  const renderSuffix = () => {
    if (!showSaveIndicator) return null;

    switch (saveState) {
      case 'saving':
        return (
          <Box paddingInlineEnd="200">
            <Spinner size="small" />
          </Box>
        );
      case 'saved':
        return (
          <Box paddingInlineEnd="200">
            <Tooltip content={successMessage}>
              <Icon source={CheckCircleIcon} tone="success" />
            </Tooltip>
          </Box>
        );
      case 'error':
        return (
          <Box paddingInlineEnd="200">
            <Tooltip content={errorMessage}>
              <Icon source={AlertCircleIcon} tone="critical" />
            </Tooltip>
          </Box>
        );
      case 'typing':
        return (
          <Box paddingInlineEnd="200">
            <InlineStack gap="100" blockAlign="center">
              <Box
                background="bg-fill-tertiary"
                borderRadius="100"
                padding="025"
              >
                <span style={{ fontSize: '10px', color: 'var(--p-color-text-subdued)' }}>●</span>
              </Box>
            </InlineStack>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <TextField
      {...textFieldProps}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      suffix={renderSuffix()}
    />
  );
}
