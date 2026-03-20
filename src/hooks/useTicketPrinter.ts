import { useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { printWithIframe, posTicketCSS, applyTicketTemplate } from '@/lib/printTicket';
import { formatCurrency } from '@/lib/utils';
import type { SaleRecord, Cliente, StoreConfig } from '@/types';

export interface UseTicketPrinterParams {
  completedSale: SaleRecord | null;
  storeConfig: StoreConfig;
  clienteId: string;
  clientes: Cliente[];
}

export function useTicketPrinter({
  completedSale,
  storeConfig,
  clienteId,
  clientes,
}: UseTicketPrinterParams) {
  const handlePrint = useCallback(() => {
    if (!completedSale) return;
    const saleDate = new Date(completedSale.date);
    const dateStr = saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const now = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

    const paymentLabels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta bancaria',
      tarjeta_manual: 'Tarjeta (manual)',
      tarjeta_web: 'Mercado Pago Web',
      transferencia: 'Transferencia',
      fiado: 'Crédito cliente',
      puntos: 'Puntos de lealtad',
    };

    const sc = storeConfig;
    const totalArticles = completedSale.items.reduce((s, i) => s + i.quantity, 0);

    const itemsHtml = completedSale.items.map((item) => `
      <div class="item-name">${item.productName}</div>
      <div class="item-detail">
        <span>${item.quantity} pza × $${item.unitPrice.toFixed(2)}</span>
        <span>$${item.subtotal.toFixed(2)}</span>
      </div>`).join('');

    // Loyalty / Fiado section
    let extraHtml = '';
    if (clienteId) {
      const c = clientes.find((cl) => cl.id === clienteId);
      if (c && completedSale.paymentMethod === 'fiado') {
        extraHtml = `
          <hr class="dash"/>
          <div class="center bold" style="font-size:11px;margin:2px 0;">** VENTA A CRÉDITO **</div>
          <div class="row"><span class="label">Cliente</span><span class="val">${c.name}</span></div>
          <div class="row"><span class="label">Nuevo saldo</span><span class="val">$${c.balance.toFixed(2)}</span></div>`;
      } else if (c) {
        extraHtml = `
          <hr class="dash"/>
          <div class="center bold" style="font-size:11px;margin:2px 0;">** PROGRAMA LEALTAD **</div>
          <div class="row"><span class="label">Puntos ganados</span><span class="val">+${Math.floor(completedSale.total / 20)}</span></div>
          <div class="row"><span class="label">Puntos totales</span><span class="val">${Math.floor(parseFloat(String(c.points)))}</span></div>`;
      }
    }

    // Generate barcode canvas
    const barcodeCanvas = document.createElement('canvas');
    let barcodeDataUrl = '';
    try {
      JsBarcode(barcodeCanvas, completedSale.folio, {
        format: sc.ticketBarcodeFormat || 'CODE128',
        width: 1.5,
        height: 45,
        displayValue: true,
        fontSize: 11,
        font: 'Courier New',
        textMargin: 2,
        margin: 0,
      });
      barcodeDataUrl = barcodeCanvas.toDataURL('image/png');
    } catch { /* ignore */ }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket ${completedSale.folio}</title>
  <style>
    ${posTicketCSS}
    .barcode-wrap{display:flex;justify-content:center;padding:4px 0;}
    .barcode-wrap img{max-width:220px;height:auto;display:block;}
  </style>
</head>
<body>
<div class="ticket">
  <div class="store-name">${sc.legalName || sc.storeName || 'Tienda'}</div>
  ${sc.address ? `<div class="store-sub">${sc.address}</div>` : ''}
  ${sc.postalCode || sc.city ? `<div class="store-sub">C.P. ${sc.postalCode}, ${sc.city}</div>` : ''}
  ${sc.rfc ? `<div class="store-sub">RFC: ${sc.rfc}</div>` : ''}
  ${sc.phone ? `<div class="store-sub">Tel: ${sc.phone}</div>` : ''}
  <div class="store-sub" style="font-size:9px;margin-top:2px;">ESTE COMPROBANTE NO ES VÁLIDO PARA EFECTOS FISCALES</div>

  <hr class="dash"/>

  <div class="doc-type">Ticket de Venta</div>
  <div class="folio">Folio: ${completedSale.folio}</div>
  <div class="fecha">${dateStr} ${timeStr}</div>

  <hr class="dash"/>

  <div class="row"><span class="label">Cajero</span><span class="val">${completedSale.cajero || '—'}</span></div>
  <div class="row"><span class="label">Pago</span><span class="val">${paymentLabels[completedSale.paymentMethod] || completedSale.paymentMethod}</span></div>

  <hr class="dash"/>

  ${itemsHtml}

  <hr class="solid"/>

  <div class="total-row"><span>Subtotal</span><span>$${(completedSale.subtotal + (completedSale.discount ?? 0)).toFixed(2)}</span></div>
  ${(completedSale.discount ?? 0) > 0 ? `<div class="total-row" style="color:#008060;"><span>Descuento</span><span>-$${completedSale.discount.toFixed(2)}</span></div>` : ''}
  <div class="total-row"><span>IVA (${sc.ivaRate ?? 16}%)</span><span>$${completedSale.iva.toFixed(2)}</span></div>
  ${completedSale.cardSurcharge > 0 ? `<div class="total-row"><span>Comisión tarjeta</span><span>$${completedSale.cardSurcharge.toFixed(2)}</span></div>` : ''}
  <hr class="solid"/>
  <div class="total-row main"><span>TOTAL</span><span>$${completedSale.total.toFixed(2)}</span></div>

  ${completedSale.paymentMethod === 'efectivo' ? `
  <hr class="dash"/>
  <div class="total-row"><span>Recibido</span><span>$${completedSale.amountPaid.toFixed(2)}</span></div>
  <div class="total-row bold"><span>Cambio</span><span>$${completedSale.change.toFixed(2)}</span></div>` : ''}

  ${extraHtml}

  <hr class="dash"/>

  <div class="total-row" style="font-size:10px;color:#555;">
    <span>Artículos vendidos</span><span>${totalArticles}</span>
  </div>

  ${barcodeDataUrl ? `<div class="barcode-wrap"><img src="${barcodeDataUrl}" alt="${completedSale.folio}"/></div>` : ''}

  <hr class="dash"/>

  ${sc.ticketFooter ? `<div class="footer-line">${sc.ticketFooter.replace(/\n/g, '<br/>')}</div>` : '<div class="footer-line">¡Gracias por su compra!</div>'}
  ${sc.ticketServicePhone ? `<div class="footer-line">Servicio al cliente: ${sc.ticketServicePhone}</div>` : ''}
  <div class="footer-line">Impreso el ${now}</div>
</div>
</body>
</html>`;

    // Build vars for custom template substitution
    const templateVars: Record<string, string> = {
      storeName: sc.legalName || sc.storeName || 'Tienda',
      folio: completedSale.folio,
      fecha: `${dateStr} ${timeStr}`,
      cajero: completedSale.cajero || '—',
      metodoPago: paymentLabels[completedSale.paymentMethod] || completedSale.paymentMethod,
      items: completedSale.items.map((item) =>
        `<div class="item-name">${item.productName}</div><div class="item-detail"><span>${item.quantity} pza × $${item.unitPrice.toFixed(2)}</span><span>$${item.subtotal.toFixed(2)}</span></div>`
      ).join(''),
      subtotal: `$${completedSale.subtotal.toFixed(2)}`,
      iva: `$${completedSale.iva.toFixed(2)}`,
      total: `$${completedSale.total.toFixed(2)}`,
      cambio: `$${completedSale.change.toFixed(2)}`,
      recibido: `$${completedSale.amountPaid.toFixed(2)}`,
      footer: sc.ticketFooter || '¡Gracias por su compra!',
    };

    printWithIframe(applyTicketTemplate(sc.ticketTemplateVenta, templateVars, html));
  }, [completedSale, clienteId, clientes, storeConfig]);

  return { handlePrint };
}
