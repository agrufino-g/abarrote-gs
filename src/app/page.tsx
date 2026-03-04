'use client';

import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";

export default function Home() {
  const { user, loading } = useRequireAuth();
  
  if (loading || !user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return <DashboardHome />;
}
