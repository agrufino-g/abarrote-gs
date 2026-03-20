import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/guard';
import { createSale } from '@/app/actions/sales-actions';
import { updateProduct } from '@/app/actions/product-actions';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[sync] Error syncing offline action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al sincronizar' },
      { status: 500 },
    );
  }
}
