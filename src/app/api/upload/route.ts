import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireAuth, AuthError } from '@/lib/auth/guard';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

// ── POST /api/upload — sube un archivo y devuelve la URL pública ──────────────
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: 'Archivo o ruta faltante.' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo imágenes.' }, { status: 400 });
    }

    // Limitar tamaño: 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el límite de 5 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: path,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[/api/upload POST]', err);
    return NextResponse.json({ error: 'Error al subir el archivo a S3.' }, { status: 500 });
  }
}

// ── DELETE /api/upload — elimina un archivo por su URL pública ────────────────
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL no proporcionada.' }, { status: 400 });
    }

    // Extraer la clave (key) desde la URL: https://bucket.s3.region.amazonaws.com/KEY
    const urlObj = new URL(url);
    // pathname empieza con '/', quitarlo
    const key = decodeURIComponent(urlObj.pathname.slice(1));

    if (!key) {
      return NextResponse.json({ error: 'No se pudo determinar la clave del archivo.' }, { status: 400 });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[/api/upload DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar el archivo de S3.' }, { status: 500 });
  }
}
