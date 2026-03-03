// Utilidades para el Dashboard de Abarrotes

/**
 * Formatea un número como moneda mexicana
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

/**
 * Formatea una fecha a formato local mexicano
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calcula los días restantes hasta una fecha
 */
export function getDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Obtiene el color de estado según los días hasta el vencimiento
 */
export function getExpirationStatus(days: number): {
  status: 'critical' | 'warning' | 'info';
  label: string;
} {
  if (days <= 1) {
    return { status: 'critical', label: 'Vence hoy o mañana' };
  } else if (days <= 3) {
    return { status: 'warning', label: `Vence en ${days} días` };
  } else if (days <= 7) {
    return { status: 'info', label: `Vence en ${days} días` };
  }
  return { status: 'info', label: `Vence en ${days} días` };
}

/**
 * Obtiene el porcentaje de stock
 */
export function getStockPercentage(current: number, min: number): number {
  if (min === 0) return 100;
  const percentage = (current / min) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Obtiene el estado del stock
 */
export function getStockStatus(current: number, min: number): {
  status: 'critical' | 'warning' | 'success';
  percentage: number;
} {
  const percentage = getStockPercentage(current, min);
  
  if (percentage <= 25) {
    return { status: 'critical', percentage };
  } else if (percentage <= 50) {
    return { status: 'warning', percentage };
  }
  return { status: 'success', percentage };
}

/**
 * Trunca texto con ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
