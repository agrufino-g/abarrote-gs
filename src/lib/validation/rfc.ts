/**
 * Mexican RFC (Registro Federal de Contribuyentes) validation.
 *
 * Persona física: 13 characters — AAAA000000XXX (4 letters + 6 digit date + 3 homoclave)
 * Persona moral:  12 characters — AAA000000XXX  (3 letters + 6 digit date + 3 homoclave)
 * Special: XAXX010101000 (público en general), XEXX010101000 (extranjero)
 */

const SPECIAL_RFCS = ['XAXX010101000', 'XEXX010101000'];

// Letters: A-Z, Ñ, & (used in Mexican RFCs)
const RFC_PERSONA_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const RFC_PERSONA_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

/**
 * Validate the 6-digit date portion (YYMMDD) of an RFC.
 */
function isValidRFCDate(dateStr: string): boolean {
  const _yy = parseInt(dateStr.slice(0, 2), 10);
  const mm = parseInt(dateStr.slice(2, 4), 10);
  const dd = parseInt(dateStr.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  // Basic month-day validation (not accounting for leap years in 2-digit year)
  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dd > maxDays[mm - 1]) return false;

  return true;
}

/**
 * Check if a string is a valid Mexican RFC.
 */
export function isValidRFC(rfc: string): boolean {
  if (!rfc) return false;
  const upper = rfc.toUpperCase().trim();

  // Special RFC values
  if (SPECIAL_RFCS.includes(upper)) return true;

  // Persona física (13 chars)
  if (upper.length === 13 && RFC_PERSONA_FISICA.test(upper)) {
    return isValidRFCDate(upper.slice(4, 10));
  }

  // Persona moral (12 chars)
  if (upper.length === 12 && RFC_PERSONA_MORAL.test(upper)) {
    return isValidRFCDate(upper.slice(3, 9));
  }

  return false;
}

/**
 * Determine the type of RFC.
 */
export function getRFCType(rfc: string): string | null {
  if (!rfc) return null;
  const upper = rfc.toUpperCase().trim();

  if (upper === 'XAXX010101000') return 'Público en general';
  if (upper === 'XEXX010101000') return 'Extranjero';
  if (upper.length === 13 && RFC_PERSONA_FISICA.test(upper)) return 'Persona física';
  if (upper.length === 12 && RFC_PERSONA_MORAL.test(upper)) return 'Persona moral';

  return null;
}
