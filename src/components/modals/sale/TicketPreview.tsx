'use client';

import { useRef } from 'react';
import { Modal, Text } from '@shopify/polaris';
import { PrintIcon } from '@shopify/polaris-icons';
import JsBarcode from 'jsbarcode';
import type { SaleRecord, Cliente, StoreConfig } from '@/types';

const TICKET_WIDTH = 40;

function centerLine(text: string, width = TICKET_WIDTH) {
  const t = text.trim();
  if (t.length >= width) return t;
  const pad = width - t.length;
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `${' '.repeat(left)}${t}${' '.repeat(right)}`;
}

function wrapAndCenter(text: string, width = TICKET_WIDTH) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > width) {
      if (current) lines.push(centerLine(current, width));
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(centerLine(current, width));
  return lines.join('\n');
}

export interface TicketPreviewProps {
  open: boolean;
  completedSale: SaleRecord;
  storeConfig: StoreConfig;
  clienteId: string;
  clientes: Cliente[];
  onPrint: () => void;
  onNewSale: () => void;
  onClose: () => void;
}

export function TicketPreview({
  open,
  completedSale,
  storeConfig,
  clienteId,
  clientes,
  onPrint,
  onNewSale,
  onClose,
}: TicketPreviewProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const saleDate = new Date(completedSale.date);
  const dateStr = saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const paymentLabels: Record<string, string> = {
    efectivo: 'EFECTIVO',
    tarjeta: 'T. BANCARIA',
    transferencia: 'TRANSFERENCIA',
    fiado: 'CREDITO CLIENTE',
  };
  const pmLabel = paymentLabels[completedSale.paymentMethod] || completedSale.paymentMethod.toUpperCase();
  const totalArticles = completedSale.items.reduce((s, i) => s + i.quantity, 0);
  const dashes = '----------------------------------------';

  const fmtAmt = (n: number) => {
    const s = '$ ' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return s.padStart(16);
  };

  let itemsTxt = '';
  for (const item of completedSale.items) {
    const name = item.productName.toUpperCase();
    const truncName = name.length > 40 ? name.substring(0, 39) + '.' : name;
    itemsTxt += `  ${truncName}\n`;
    itemsTxt += `    ${item.quantity} pza x $${item.unitPrice.toFixed(2)}${fmtAmt(item.subtotal)}\n`;
  }

  let fiadoTxt = '';
  if (clienteId) {
    const c = clientes.find((cl) => cl.id === clienteId);
    if (c && completedSale.paymentMethod === 'fiado') {
      fiadoTxt = `\n${dashes}\n       ** VENTA A CREDITO **\n  CLIENTE:        ${c.name.toUpperCase()}\n  SALDO ANTERIOR:${fmtAmt(c.balance - completedSale.total)}\n  NUEVO SALDO:   ${fmtAmt(c.balance)}\n`;
    } else if (c) {
      fiadoTxt = `\n${dashes}\n       ** PROGRAMA LEALTAD **\n  PUNTOS GANADOS:      +${Math.floor(completedSale.total / 20)}\n  PUNTOS TOTALES:      ${Math.floor(parseFloat(String(c.points)))}\n`;
    }
  }

  const sc = storeConfig;
  const footerLines = sc.ticketFooter.split('\n').map((l: string) => centerLine(l)).join('\n');
  const tcCode = completedSale.folio;

  const previewText = `
${centerLine(sc.legalName)}
${centerLine(sc.address)}
${centerLine(`C.P. ${sc.postalCode}, ${sc.city}`)}
${centerLine(`RFC: ${sc.rfc}`)}
${centerLine(`TEL: ${sc.phone}`)}
${centerLine(`REGIMEN FISCAL - ${sc.regimenFiscal}`)}
${wrapAndCenter(sc.regimenDescription)}
${centerLine('ESTE COMPROBANTE NO ES VALIDO PARA')}
${centerLine('EFECTOS FISCALES')}

${centerLine(`TDA#${sc.storeNumber} OP#${completedSale.cajero.toUpperCase().substring(0, 12).padEnd(12)}  TR# ${completedSale.folio}`)}
${centerLine(`${dateStr}              ${timeStr}`)}
${centerLine('RFC: SIN R.F.C.')}
${dashes}
${itemsTxt}${dashes}
  SUBTOTAL               ${fmtAmt(completedSale.subtotal + (completedSale.discount ?? 0))}
${(completedSale.discount ?? 0) > 0 ? `  DESCUENTO             ${fmtAmt(-(completedSale.discount ?? 0))}\n` : ''}${completedSale.cardSurcharge > 0 ? `  COMISION TARJETA       ${fmtAmt(completedSale.cardSurcharge)}\n` : ''}
  TOTAL                  ${fmtAmt(completedSale.total)}
  ${pmLabel.padEnd(20)}${fmtAmt(completedSale.total)}
  CAMBIO                 ${fmtAmt(completedSale.change)}
${completedSale.paymentMethod === 'efectivo' ? `  RECIBIDO               ${fmtAmt(completedSale.amountPaid)}\n` : ''}${fiadoTxt}
${dashes}
  IVA    ${sc.ivaRate}.0%  ${fmtAmt(completedSale.subtotal)}${fmtAmt(completedSale.iva)}
${dashes}
  TOTAL IVA              ${fmtAmt(completedSale.iva)}

       ARTICULOS VENDIDOS    ${totalArticles}
`;

  const previewTextAfter = `${dashes}

${footerLines}
${centerLine('Necesitas ayuda ahora?')}
${centerLine(sc.ticketServicePhone)}
${dashes}
${centerLine(`Vigencia ${sc.ticketVigencia}`)}
${centerLine(`${dateStr}     ${timeStr}`)}
${centerLine(`TC: ${tcCode}`)}
`;

  const preStyle: React.CSSProperties = {
    fontFamily: "'Courier New', 'Consolas', 'Lucida Console', monospace",
    fontSize: '11.5px',
    lineHeight: '1.3',
    margin: 0,
    padding: '4px 6px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#000',
    background: '#fff',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ticket de Venta"
      primaryAction={{
        content: 'Imprimir Ticket',
        icon: PrintIcon,
        onAction: onPrint,
      }}
      secondaryActions={[
        { content: 'Nueva Venta', onAction: onNewSale },
        { content: 'Cerrar', onAction: onClose },
      ]}
    >
      <Modal.Section>
        <div ref={ticketRef}>
          <div style={{ background: '#fff', padding: '8px', maxWidth: '340px', margin: '0 auto', border: '1px solid #ddd' }}>
            <pre style={preStyle}>{previewText}</pre>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6px 0', width: '100%' }}>
              <svg style={{ display: 'block', margin: '0 auto', maxWidth: '260px' }} ref={(el) => {
                if (el) {
                  try {
                    JsBarcode(el, tcCode, {
                      format: sc.ticketBarcodeFormat || 'CODE128',
                      width: 1.5,
                      height: 40,
                      displayValue: true,
                      fontSize: 10,
                      font: 'Courier New',
                      textMargin: 2,
                      margin: 0,
                    });
                  } catch { /* ignore */ }
                }
              }} />
            </div>
            <pre style={preStyle}>{previewTextAfter}</pre>
          </div>
        </div>
      </Modal.Section>
    </Modal>
  );
}
