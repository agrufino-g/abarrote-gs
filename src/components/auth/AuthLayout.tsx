'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/backgrounds/login_bg.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '24px'
    }}>
      {children}

      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '0',
        right: '0',
        textAlign: 'center',
        padding: '0 16px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#5c5f62',
          fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
        }}>
          &copy; {new Date().getFullYear()}, Opendex Web Services, Inc. o sus empresas afiliadas. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
