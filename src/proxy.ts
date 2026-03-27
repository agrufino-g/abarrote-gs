import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

const authHandler = auth.middleware({ loginUrl: '/auth/login' });

/**
 * Applies security headers to the response.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );
  response.headers.set('X-XSS-Protection', '1; mode=block');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://sdk.mercadopago.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.amazonaws.com https://lh3.googleusercontent.com https://*.mlstatic.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.telegram.org https://api.mercadopago.com https://*.amazonaws.com wss://*.firebaseio.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export async function proxy(request: Parameters<typeof authHandler>[0]) {
  const response = await authHandler(request);

  // authHandler returns either a redirect or NextResponse.next()
  if (response) {
    applySecurityHeaders(response);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|auth|login-brand\\.svg|backgrounds).*)',
  ],
};
