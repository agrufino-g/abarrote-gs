/**
 * printWithIframe — Prints an HTML string using a hidden iframe + blob URL.
 * Works around browser popup-blocker restrictions on window.open().
 */
export function printWithIframe(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 2000);
    }, 150);
  };
}

/**
 * applyTicketTemplate — Replaces {{variable}} placeholders in a custom HTML
 * template with the supplied values map, then prints using printWithIframe.
 *
 * If no template is provided it falls back to the defaultHtml.
 */
export function applyTicketTemplate(
  template: string | undefined,
  vars: Record<string, string>,
  defaultHtml: string
): string {
  if (!template) return defaultHtml;
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {{key}} (with optional spaces inside braces)
    result = result.replaceAll(`{{${key}}}`, value);
    result = result.replaceAll(`{{ ${key} }}`, value);
  }
  return result;
}

// ─── Shared CSS for all 80mm POS tickets ────────────────────────────────────
export const posTicketCSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:ui-monospace,'SF Mono','Cascadia Mono','Courier New',monospace;
    font-size:12px;color:#000;background:#fff;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .ticket{width:72mm;margin:0 auto;padding:5mm 3mm;background:#fff;}
  .center{text-align:center;}
  .right{text-align:right;}
  .bold{font-weight:700;}
  .store-name{font-size:15px;font-weight:700;text-align:center;line-height:1.2;margin-bottom:2px;}
  .store-sub{font-size:10px;text-align:center;color:#444;line-height:1.5;}
  .dash{border:none;border-top:1px dashed #888;margin:5px 0;}
  .solid{border:none;border-top:2px solid #000;margin:5px 0;}
  .doc-type{text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:3px 0 1px;}
  .folio{text-align:center;font-size:11px;margin-bottom:1px;}
  .fecha{text-align:center;font-size:10px;color:#555;}
  .row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0;}
  .row .label{color:#555;}
  .row .val{font-weight:600;text-align:right;max-width:55%;overflow-wrap:break-word;}
  .item-name{font-size:11px;font-weight:600;padding-top:4px;}
  .item-detail{display:flex;justify-content:space-between;font-size:11px;color:#333;padding-bottom:3px;border-bottom:1px dotted #ccc;}
  .total-row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0;}
  .total-row.main{font-size:14px;font-weight:700;padding:4px 0 2px;}
  .footer-line{font-size:10px;text-align:center;color:#555;line-height:1.6;}
  .footer-bold{font-weight:700;color:#000;}
  .reprint-badge{
    text-align:center;font-size:10px;font-weight:700;
    letter-spacing:1px;text-transform:uppercase;
    border:1px dashed #000;padding:2px 6px;margin:4px auto;display:inline-block;
  }
  @media print{
    body{background:#fff;}
    .ticket{padding:2mm 2mm;}
    @page{size:80mm auto;margin:0;}
  }
`;
