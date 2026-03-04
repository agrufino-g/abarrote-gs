'use client';

import { useState, useCallback } from 'react';
import { ActionList, Popover, Avatar, Text, InlineStack } from '@shopify/polaris';
import { useAuth } from '@/lib/auth/AuthContext';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((a) => !a), []);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || 'U';

  const activator = (
    <button
      onClick={toggleActive}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '50%',
      }}
    >
      <InlineStack gap="200" align="center" blockAlign="center">
        <Avatar
          initials={initials}
          size="sm"
          name={user.displayName || user.email || 'User'}
          source={user.photoURL || undefined}
        />
        <Text as="span" variant="bodySm">
          {user.displayName || user.email?.split('@')[0] || 'Usuario'}
        </Text>
      </InlineStack>
    </button>
  );

  return (
    <Popover
      active={active}
      activator={activator}
      autofocusTarget="first-node"
      onClose={toggleActive}
    >
      <ActionList
        actionRole="menuitem"
        items={[
          {
            content: user.email || '',
            disabled: true,
          },
          {
            content: 'Cerrar sesión',
            destructive: true,
            onAction: () => {
              toggleActive();
              signOut();
            },
          },
        ]}
      />
    </Popover>
  );
}
