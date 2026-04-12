'use client';

/**
 * (public) Route Group Layout - Customer Display
 *
 * This layout does NOT include AuthProvider.
 * The customer display is a PUBLIC page shown to customers.
 * It should NOT share authentication state with the dashboard.
 *
 * This completely isolates /display from the auth system,
 * preventing any race conditions or session interference.
 */

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // No AuthProvider - completely isolated from auth
  return <>{children}</>;
}
