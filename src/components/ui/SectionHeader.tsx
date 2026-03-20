'use client';

import { InlineStack, Text, Badge, Button } from '@shopify/polaris';
import type { BadgeProps, ButtonProps } from '@shopify/polaris';
import type { ReactNode } from 'react';

interface SectionAction {
  content: string;
  icon?: ButtonProps['icon'];
  onAction: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'plain';
  tone?: 'critical';
  loading?: boolean;
  disabled?: boolean;
}

interface SectionHeaderProps {
  title: string;
  badge?: { content: string; tone: BadgeProps['tone'] };
  subtitle?: string;
  primaryAction?: SectionAction;
  secondaryActions?: SectionAction[];
  children?: ReactNode;
}

export function SectionHeader({
  title,
  badge,
  subtitle,
  primaryAction,
  secondaryActions,
  children,
}: SectionHeaderProps) {
  const actions = [
    ...(secondaryActions ?? []),
    ...(primaryAction ? [{ ...primaryAction, variant: primaryAction.variant ?? 'primary' as const }] : []),
  ];

  return (
    <>
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="300" blockAlign="center">
          <Text as="h2" variant="headingMd">{title}</Text>
          {badge && <Badge tone={badge.tone}>{badge.content}</Badge>}
        </InlineStack>
        {actions.length > 0 && (
          <InlineStack gap="200">
            {actions.map((a) => (
              <Button
                key={a.content}
                icon={a.icon}
                variant={a.variant as 'primary' | 'secondary' | 'tertiary' | 'plain' | undefined}
                tone={a.tone}
                onClick={a.onAction}
                loading={a.loading}
                disabled={a.disabled}
              >
                {a.content}
              </Button>
            ))}
          </InlineStack>
        )}
      </InlineStack>
      {subtitle && (
        <Text as="p" variant="bodySm" tone="subdued">{subtitle}</Text>
      )}
      {children}
    </>
  );
}
