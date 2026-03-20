'use client';

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Proveedor } from '@/types';

export interface DistribuidorSelectorProps {
  proveedores: Proveedor[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCrearNuevo: () => void;
}

export function DistribuidorSelector({ proveedores, selectedId, onSelect, onCrearNuevo }: DistribuidorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activos = proveedores.filter(p => p.activo);
  const filtered = search.trim()
    ? activos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : activos;
  const selected = activos.find(p => p.id === selectedId);

  const handleToggle = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(o => !o);
  }, []);

  const close = useCallback(() => { setOpen(false); setSearch(''); }, []);

  const dropdown = open && rect ? (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={close} />
      <div style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        border: '1px solid #e1e3e5',
        overflow: 'hidden',
      }}>
        {activos.length > 0 && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f1f1' }}>
            <input
              autoFocus
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #e1e3e5', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              placeholder="Buscar distribuidor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        {filtered.length > 0 ? (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p.id); close(); }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: selectedId === p.id ? '#f6f6f7' : 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: '#303030' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f6f6f7')}
                onMouseOut={e => (e.currentTarget.style.background = selectedId === p.id ? '#f6f6f7' : 'transparent')}
              >
                <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                {p.email && <div style={{ fontSize: '12px', color: '#6d7175' }}>{p.email}</div>}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: '14px', fontSize: '13px', color: '#6d7175', textAlign: 'center' }}>
            No se encontraron distribuidores
          </div>
        )}
        <div style={{ borderTop: '1px solid #f1f1f1' }}>
          <button
            type="button"
            onClick={() => { close(); onCrearNuevo(); }}
            style={{ display: 'block', width: '100%', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: '#2563eb', fontWeight: 500 }}
            onMouseOver={e => (e.currentTarget.style.background = '#f0f5ff')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            + Crear nuevo distribuidor
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '6px 12px', border: '1px solid #c9cccf',
          borderRadius: '8px', background: '#fff', cursor: 'pointer',
          fontSize: '14px', color: selected ? '#303030' : '#8c8c8c',
          textAlign: 'left', height: '36px',
        }}
      >
        <span>{selected ? selected.nombre : 'Seleccionar distribuidor'}</span>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: '#6d7175', flexShrink: 0 }}>
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}
