'use client';

import { InlineStack, Icon } from '@shopify/polaris';
import { MenuIcon } from '@shopify/polaris-icons';
import Image from 'next/image';

interface CustomTopBarProps {
  userMenu: React.ReactNode;
  onNavigationToggle?: () => void;
}

export function CustomTopBar({ userMenu, onNavigationToggle }: CustomTopBarProps) {
  return (
    <div
      style={{
        height: '56px',
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #303030',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <Image
            src="/logo.svg"
            alt="Opendex Kiosko"
            width={140}
            height={36}
            priority
            style={{ display: 'block' }}
          />
        </div>
      </InlineStack>

      {/* Right side: User menu */}
      <div>{userMenu}</div>
    </div>
  );
}
