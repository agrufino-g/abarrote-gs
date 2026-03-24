'use client';

import React from 'react';
import { Box, InlineStack, Text, Icon } from '@shopify/polaris';

export type ChipTone = 'base' | 'subdued' | 'info' | 'success' | 'warning' | 'critical' | 'highlight';

interface ChipProps {
  /** Texto a mostrar dentro del chip */
  children: React.ReactNode;
  /** Tono visual del chip */
  tone?: ChipTone;
  /** Icono opcional para proporcionar contexto visual */
  icon?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  /** Estilo de borde redondeado (pill) */
  pill?: boolean;
}

/**
 * Componente Chip para mostrar etiquetas estáticas, categorías o atributos.
 * Ayuda a clasificar y organizar el contenido de forma compacta.
 */
export function Chip({ 
  children, 
  tone = 'base', 
  icon,
  pill = false 
}: ChipProps) {
  
  // Mapeo de tonos a colores de Polaris
  const getStyles = (t: ChipTone) => {
    switch (t) {
      case 'subdued':
        return { bg: 'var(--p-color-bg-fill-secondary)', text: 'var(--p-color-text-secondary)', border: 'var(--p-color-border-secondary)' };
      case 'info':
        return { bg: 'var(--p-color-bg-fill-info-subdued)', text: 'var(--p-color-text-info)', border: 'var(--p-color-border-info-subdued)' };
      case 'success':
        return { bg: 'var(--p-color-bg-fill-success-subdued)', text: 'var(--p-color-text-success)', border: 'var(--p-color-border-success-subdued)' };
      case 'warning':
        return { bg: 'var(--p-color-bg-fill-warning-subdued)', text: 'var(--p-color-text-warning)', border: 'var(--p-color-border-warning-subdued)' };
      case 'critical':
        return { bg: 'var(--p-color-bg-fill-critical-subdued)', text: 'var(--p-color-text-critical)', border: 'var(--p-color-border-critical-subdued)' };
      case 'highlight':
        return { bg: 'var(--p-color-bg-fill-brand-subdued)', text: 'var(--p-color-text-brand)', border: 'var(--p-color-border-brand-subdued)' };
      default:
        return { bg: 'var(--p-color-bg-fill-tertiary)', text: 'var(--p-color-text)', border: 'var(--p-color-border)' };
    }
  };

  const styles = getStyles(tone);

  return (
    <Box
      as="span"
      paddingInlineStart="200"
      paddingInlineEnd="200"
      paddingBlockStart="050"
      paddingBlockEnd="050"
      background={styles.bg as any}
      borderRadius={pill ? '500' : '100'}
      borderWidth="025"
      borderColor={styles.border as any}
      maxWidth="max-content"
    >
      <InlineStack gap="100" align="center" blockAlign="center">
        {icon && (
          <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center' }}>
             <Icon source={icon} tone="base" />
          </div>
        )}
        <span style={{ color: styles.text }}>
          <Text as="span" variant="bodyXs" fontWeight="medium">
            {children}
          </Text>
        </span>
      </InlineStack>
    </Box>
  );
}
