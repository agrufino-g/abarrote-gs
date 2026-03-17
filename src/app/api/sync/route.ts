import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { createSale } from '@/app/actions/sales-actions';
import { updateProduct } from '@/app/actions/product-actions';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication via cookie (same as middleware)
    const sessionCookie = req.cookies.get('__session')?.value;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : sessionCookie;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
      await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    const { action, payload } = await req.json();

    const allowedActions = ['createSale', 'updateProduct'] as const;
    if (!allowedActions.includes(action as typeof allowedActions[number])) {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    switch (action) {
      case 'createSale':
        await createSale(payload);
        break;
      case 'updateProduct':
        await updateProduct(payload.id, payload);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[sync] Error syncing offline action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al sincronizar' },
      { status: 500 },
    );
  }
}
