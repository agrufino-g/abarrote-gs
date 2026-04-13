/**
 * ESC/POS Command Constants & Builder
 *
 * Standard ESC/POS commands compatible with Epson TM-T20/T88,
 * Star TSP143, Xprinter, and most 80mm thermal printers.
 */

// ── Control Commands ─────────────────────────────────────────────
export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;
export const CR = 0x0d;
export const HT = 0x09;
export const DLE = 0x10;
export const FS = 0x1c;

// ── Command Builders ─────────────────────────────────────────────

/** Initialize printer (reset to default settings) */
export const INIT = new Uint8Array([ESC, 0x40]);

/** Line feed */
export const LINE_FEED = new Uint8Array([LF]);

/** Feed n lines */
export function feedLines(n: number): Uint8Array {
  return new Uint8Array([ESC, 0x64, n]);
}

/** Cut paper (partial cut) */
export const CUT_PARTIAL = new Uint8Array([GS, 0x56, 0x01]);

/** Cut paper (full cut) */
export const CUT_FULL = new Uint8Array([GS, 0x56, 0x00]);

// ── Text Formatting ──────────────────────────────────────────────

/** Text alignment */
export const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
export const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
export const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);

/** Bold on/off */
export const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);
export const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);

/** Underline on/off */
export const UNDERLINE_ON = new Uint8Array([ESC, 0x2d, 0x01]);
export const UNDERLINE_OFF = new Uint8Array([ESC, 0x2d, 0x00]);

/** Double height on/off */
export const DOUBLE_HEIGHT_ON = new Uint8Array([ESC, 0x21, 0x10]);
export const DOUBLE_HEIGHT_OFF = new Uint8Array([ESC, 0x21, 0x00]);

/** Double width + double height (for TOTAL lines) */
export const DOUBLE_SIZE_ON = new Uint8Array([GS, 0x21, 0x11]);
export const DOUBLE_SIZE_OFF = new Uint8Array([GS, 0x21, 0x00]);

/** Normal size */
export const NORMAL_SIZE = new Uint8Array([GS, 0x21, 0x00]);

/** Small text (font B — smaller, more columns per line) */
export const FONT_A = new Uint8Array([ESC, 0x4d, 0x00]); // 12x24 — 42 cols on 80mm
export const FONT_B = new Uint8Array([ESC, 0x4d, 0x01]); // 9x17  — 56 cols on 80mm

// ── Separator Lines ──────────────────────────────────────────────

/** Horizontal rule (48 chars for 80mm, Font A) */
export function horizontalRule(char: string = '-', width: number = 48): Uint8Array {
  return encodeText(char.repeat(width));
}

/** Double horizontal rule */
export function doubleRule(width: number = 48): Uint8Array {
  return encodeText('='.repeat(width));
}

// ── Cash Drawer ──────────────────────────────────────────────────

/** Open cash drawer — Pin 2 (most common) */
export const DRAWER_KICK_PIN2 = new Uint8Array([ESC, 0x70, 0x00, 0x19, 0x78]);

/** Open cash drawer — Pin 5 (alternative) */
export const DRAWER_KICK_PIN5 = new Uint8Array([ESC, 0x70, 0x01, 0x19, 0x78]);

// ── Barcode ──────────────────────────────────────────────────────

/** Print CODE128 barcode */
export function barcodeCode128(data: string): Uint8Array {
  const encoded = new TextEncoder().encode(data);
  return concatBytes([
    new Uint8Array([GS, 0x68, 0x50]),       // Height = 80
    new Uint8Array([GS, 0x77, 0x02]),       // Width = 2
    new Uint8Array([GS, 0x48, 0x02]),       // HRI below barcode
    new Uint8Array([GS, 0x6b, 0x49]),       // CODE128 type
    new Uint8Array([encoded.length + 2]),    // Data length + 2
    new Uint8Array([0x7b, 0x42]),            // Code set B
    encoded,
  ]);
}

// ── Utility Functions ────────────────────────────────────────────

/** Encode text to bytes using the printer's code page (CP437/Latin-1) */
export function encodeText(text: string): Uint8Array {
  // Use TextEncoder for basic ASCII, handle extended Latin chars via CP858/Latin-1
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else {
      // Map common Spanish characters to CP858 equivalents
      const CP_MAP: Record<number, number> = {
        0x00e1: 0xa0, // á
        0x00e9: 0x82, // é
        0x00ed: 0xa1, // í
        0x00f3: 0xa2, // ó
        0x00fa: 0xa3, // ú
        0x00f1: 0xa4, // ñ
        0x00d1: 0xa5, // Ñ
        0x00c1: 0xb5, // Á
        0x00c9: 0x90, // É
        0x00cd: 0xd6, // Í
        0x00d3: 0xe0, // Ó
        0x00da: 0xe9, // Ú
        0x00bf: 0xa8, // ¿
        0x00a1: 0xad, // ¡
        0x00fc: 0x81, // ü
        0x00dc: 0x9a, // Ü
      };
      bytes.push(CP_MAP[code] ?? 0x3f); // fallback to '?'
    }
  }
  return new Uint8Array(bytes);
}

/** Set code page to CP858 (Latin-1 with Euro sign — best for Spanish) */
export const SET_CP858 = new Uint8Array([ESC, 0x74, 0x13]);

/** Concatenate multiple Uint8Arrays into one */
export function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/** Format a row with left-aligned text and right-aligned value */
export function formatRow(left: string, right: string, width: number = 48): Uint8Array {
  const space = width - left.length - right.length;
  const padding = space > 0 ? ' '.repeat(space) : ' ';
  return encodeText(`${left}${padding}${right}`);
}
