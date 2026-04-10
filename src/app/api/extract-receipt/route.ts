import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/guard';

export async function POST(req: Request) {
  try {
    await requireAuth();

    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Falta la URL del comprobante' }, { status: 400 });
    }

    // Attempt to download the file to process it locally
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'No se pudo descargar el archivo' }, { status: 400 });
    }
    const buffer = await fileRes.arrayBuffer();

    // Determine mimeType manually for simple forms
    const isPdf = url.toLowerCase().endsWith('.pdf') || fileRes.headers.get('content-type')?.includes('pdf');
    const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';

    const promptText = `
      Eres un asistente experto en contabilidad. Analiza el siguiente ticket o factura comercial.
      Extrae los siguientes datos con atención al detalle y genera única y exactamente el objeto JSON estructurado:

      - concepto: un resumen general de lo que se compró (por ejemplo: "Insumos de limpieza", "Mercancía Sabritas", etc. muy corto y descriptivo).
      - monto: el monto total final cobrado, en número decimal (por ejemplo: 1540.50). Si no encuentras un total, intenta sumar.
      - fecha: la fecha de la compra en formato AAAA-MM-DD. Si no hay, usa "2024-01-01" pero trata de encontrarla.
      - categoria: elige estrictamente una de las siguientes: "renta", "servicios", "proveedores", "salarios", "mantenimiento", "impuestos", "otro". Intenta inferir la mejor basada en la compra (ej. mercancía -> proveedores).
    `;

    // Extract information using Vercel AI SDK
    const { object } = await generateObject({
      model: openai('gpt-4o-mini', { structuredOutputs: true }),
      schema: z.object({
        concepto: z.string().describe('El concepto de la compra resumido'),
        monto: z.number().describe('El costo total o pago total de la factura o ticket'),
        fecha: z.string().describe('La fecha de la compra o facturación YYYY-MM-DD'),
        categoria: z.enum([
          'renta',
          'servicios',
          'proveedores',
          'salarios',
          'mantenimiento',
          'impuestos',
          'otro',
        ]).describe('Categoría calculada según la tienda o rubro de los productos'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            isPdf 
              ? { type: 'file', data: buffer, mimeType: 'application/pdf' }
              : { type: 'image', image: buffer }
          ]
        }
      ]
    });

    return NextResponse.json({ data: object });
  } catch (error: any) {
    console.error('[API] /extract-receipt Error:', error);
    return NextResponse.json(
      { error: 'Error procesando el recibo', details: error.message },
      { status: 500 }
    );
  }
}
