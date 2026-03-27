'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { Icon } from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';

/**
 * Size presets matching Polaris Thumbnail sizes.
 * Maps semantic size names to pixel dimensions.
 */
const SIZE_MAP = {
  extraSmall: 24,
  small: 40,
  medium: 60,
  large: 80,
} as const;

type SizePreset = keyof typeof SIZE_MAP;

interface OptimizedImageProps {
  /** S3 or remote image URL. Falls back to placeholder when empty/null. */
  source: string | null | undefined;
  /** Alt text for accessibility. */
  alt: string;
  /** Polaris-compatible size preset or custom pixel number. */
  size?: SizePreset | number;
  /** Border radius in CSS units. Defaults to Polaris standard (8px). */
  borderRadius?: string;
  /** Whether this image is above the fold and should load eagerly. */
  priority?: boolean;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * Drop-in replacement for Polaris <Thumbnail> with Next.js Image optimization.
 *
 * Benefits over raw <img> / <Thumbnail>:
 * - Automatic WebP/AVIF format conversion
 * - Responsive srcset generation
 * - Lazy loading by default (with native browser intersection observer)
 * - Blur-up placeholder while loading
 * - Correct width/height prevents CLS
 */
export function OptimizedImage({
  source,
  alt,
  size = 'small',
  borderRadius = 'var(--p-border-radius-200)',
  priority = false,
  className,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const px = typeof size === 'number' ? size : SIZE_MAP[size];

  const handleError = useCallback(() => setHasError(true), []);

  // Show placeholder icon when no source or on error
  if (!source || hasError) {
    return (
      <div
        className={className}
        style={{
          width: px,
          height: px,
          borderRadius,
          backgroundColor: 'var(--p-color-bg-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon source={ImageIcon} tone="subdued" />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        borderRadius,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        backgroundColor: 'var(--p-color-bg-surface-secondary)',
      }}
    >
      <Image
        src={source}
        alt={alt}
        width={px}
        height={px}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        quality={75}
        onError={handleError}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
