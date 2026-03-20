import { useMemo, useState } from 'react';
import type { SaleRecord, Gasto, Product } from '@/types';

export type ReportePeriodo = 'today' | 'week' | 'month' | 'all';

export interface EstadoResultados {
  ingresos: number;
  costoMercancia: number;
  utilidadBruta: number;
  margenBruto: number;
  gastosByCategory: Record<string, number>;
  totalGastos: number;
  utilidadNeta: number;
  margenNeto: number;
}

export interface MargenCategoria {
  cat: string;
  ingresos: number;
  costo: number;
  qty: number;
  utilidad: number;
  margen: number;
}

export interface FlujoMensualItem {
  label: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

function getDateRange(periodo: ReportePeriodo): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (periodo === 'today') return { start: end, end };
  if (periodo === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 6);
    return { start: d.toISOString().split('T')[0], end };
  }
  if (periodo === 'month') {
    return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end };
  }
  return { start: '2000-01-01', end };
}

export function useFinancialReports(
  saleRecords: SaleRecord[],
  gastos: Gasto[],
  products: Product[],
) {
  const [periodo, setPeriodo] = useState<ReportePeriodo>('month');

  const { start, end } = useMemo(() => getDateRange(periodo), [periodo]);

  // ── Datos filtrados por período ──
  const filteredSales = useMemo(
    () => saleRecords.filter(s => s.date >= start && s.date <= end + 'T23:59:59'),
    [saleRecords, start, end],
  );
  const filteredGastos = useMemo(
    () => gastos.filter(g => g.fecha >= start && g.fecha <= end + 'T23:59:59'),
    [gastos, start, end],
  );

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // ── Estado de Resultados ──
  const estadoResultados = useMemo<EstadoResultados>(() => {
    let ingresos = 0;
    let costoMercancia = 0;

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const prod = productMap.get(item.productId);
        costoMercancia += (prod?.costPrice ?? 0) * item.quantity;
        ingresos += item.subtotal;
      });
    });

    const utilidadBruta = ingresos - costoMercancia;
    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;

    const gastosByCategory: Record<string, number> = {};
    let totalGastos = 0;
    filteredGastos.forEach(g => {
      gastosByCategory[g.categoria] = (gastosByCategory[g.categoria] || 0) + g.monto;
      totalGastos += g.monto;
    });

    const utilidadNeta = utilidadBruta - totalGastos;
    const margenNeto = ingresos > 0 ? (utilidadNeta / ingresos) * 100 : 0;

    return { ingresos, costoMercancia, utilidadBruta, margenBruto, gastosByCategory, totalGastos, utilidadNeta, margenNeto };
  }, [filteredSales, filteredGastos, productMap]);

  // ── Márgenes por Categoría ──
  const margenesPorCategoria = useMemo<MargenCategoria[]>(() => {
    const catData: Record<string, { ingresos: number; costo: number; qty: number }> = {};

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const prod = productMap.get(item.productId);
        const cat = prod?.category || 'Sin categoría';
        if (!catData[cat]) catData[cat] = { ingresos: 0, costo: 0, qty: 0 };
        catData[cat].ingresos += item.subtotal;
        catData[cat].costo += (prod?.costPrice ?? 0) * item.quantity;
        catData[cat].qty += item.quantity;
      });
    });

    return Object.entries(catData)
      .map(([cat, d]) => {
        const utilidad = d.ingresos - d.costo;
        const margen = d.ingresos > 0 ? (utilidad / d.ingresos) * 100 : 0;
        return { cat, ...d, utilidad, margen };
      })
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [filteredSales, productMap]);

  // ── Flujo de Efectivo Mensual (últimos 6 meses) ──
  const flujoMensual = useMemo<FlujoMensualItem[]>(() => {
    const months: { label: string; key: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      months.push({ label, key });
    }

    return months.map(({ label, key }) => {
      const ingresos = saleRecords
        .filter(s => s.date.startsWith(key))
        .reduce((sum, s) => sum + s.total, 0);
      const egresos = gastos
        .filter(g => g.fecha.startsWith(key))
        .reduce((sum, g) => sum + g.monto, 0);
      const utilidad = ingresos - egresos;
      return { label, ingresos, egresos, utilidad };
    });
  }, [saleRecords, gastos]);

  const maxFlujo = useMemo(
    () => Math.max(...flujoMensual.map(m => Math.max(m.ingresos, m.egresos, 1))),
    [flujoMensual],
  );

  // ── Ventas por método ──
  const ventasPorMetodo = useMemo(() => {
    const methods: Record<string, { total: number; count: number }> = {
      efectivo: { total: 0, count: 0 },
      tarjeta: { total: 0, count: 0 },
      transferencia: { total: 0, count: 0 },
      fiado: { total: 0, count: 0 },
    };
    filteredSales.forEach(s => {
      if (!methods[s.paymentMethod]) methods[s.paymentMethod] = { total: 0, count: 0 };
      methods[s.paymentMethod].total += s.total;
      methods[s.paymentMethod].count += 1;
    });
    return methods;
  }, [filteredSales]);

  return {
    periodo,
    setPeriodo,
    filteredSales,
    filteredGastos,
    estadoResultados,
    margenesPorCategoria,
    flujoMensual,
    maxFlujo,
    ventasPorMetodo,
  };
}
