'use client';

import { useState, useCallback, type CSSProperties } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import type { Proveedor } from '@/types';

/* ─── Estados de México para el select ─── */
const ESTADOS_MX = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

/* ─── Estilos reutilizables del modal ─── */
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#303030',
  marginBottom: '6px',
};
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #c9cccf',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#303030',
  outline: 'none',
  height: '36px',
  boxSizing: 'border-box',
  background: '#fff',
};

/* ─── Modal Crear Distribuidor ─── */
export interface CrearDistribuidorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (proveedor: Proveedor) => void;
}

export function CrearDistribuidorModal({ open, onClose, onSaved }: CrearDistribuidorModalProps) {
  const addProveedor = useDashboardStore((s) => s.addProveedor);
  const { showSuccess, showError } = useToast();

  const [saving, setSaving] = useState(false);
  const [empresa, setEmpresa] = useState('');
  const [calle, setCalle] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [estado, setEstado] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  const resetForm = useCallback(() => {
    setEmpresa('');
    setCalle('');
    setApartamento('');
    setCodigoPostal('');
    setCiudad('');
    setEstado('');
    setContacto('');
    setEmail('');
    setTelefono('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleGuardar = useCallback(async () => {
    if (!empresa.trim()) return;
    setSaving(true);
    try {
      const direccion = [calle, apartamento, ciudad, estado, codigoPostal].filter(Boolean).join(', ');
      const newProv = await addProveedor({
        nombre: empresa.trim(),
        contacto: contacto.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion,
        categorias: [],
        notas: '',
        activo: true,
      });
      showSuccess(`Distribuidor "${empresa}" creado`);
      onSaved(newProv);
      resetForm();
      onClose();
    } catch {
      showError('Error al crear el distribuidor');
    }
    setSaving(false);
  }, [
    empresa,
    calle,
    apartamento,
    codigoPostal,
    ciudad,
    estado,
    contacto,
    email,
    telefono,
    addProveedor,
    showSuccess,
    showError,
    onSaved,
    resetForm,
    onClose,
  ]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          margin: '16px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e1e3e5',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>Crear distribuidor</span>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6d7175',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Empresa */}
          <div>
            <label style={labelStyle}>Empresa</label>
            <input style={inputStyle} value={empresa} onChange={(e) => setEmpresa(e.target.value)} autoFocus />
          </div>

          {/* País o región */}
          <div>
            <label style={labelStyle}>País o región</label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}>
                <option>México</option>
              </select>
              <svg
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6d7175',
                }}
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Calle y número */}
          <div>
            <label style={labelStyle}>Calle y número de casa</label>
            <div style={{ position: 'relative' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6d7175',
                  pointerEvents: 'none',
                }}
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M13 13l4 4M9 15A6 6 0 109 3a6 6 0 000 12z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                style={{ ...inputStyle, paddingLeft: '34px' }}
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          {/* Apartamento */}
          <div>
            <label style={labelStyle}>Apartamento, local, etc.</label>
            <input style={inputStyle} value={apartamento} onChange={(e) => setApartamento(e.target.value)} />
          </div>

          {/* CP + Ciudad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Código postal</label>
              <input style={inputStyle} value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Ciudad</label>
              <input style={inputStyle} value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label style={labelStyle}>Estado</label>
            <div style={{ position: 'relative' }}>
              <select
                style={{ ...inputStyle, appearance: 'none', paddingRight: '32px', cursor: 'pointer' }}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="">Selecciona estado</option>
                {ESTADOS_MX.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <svg
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6d7175',
                }}
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Nombre del contacto */}
          <div>
            <label style={labelStyle}>Nombre del contacto</label>
            <input style={inputStyle} value={contacto} onChange={(e) => setContacto(e.target.value)} />
          </div>

          {/* Email + Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Dirección de correo electrónico</label>
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Número de teléfono</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Bandera MX */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 10px',
                    border: '1px solid #c9cccf',
                    borderRadius: '8px',
                    background: '#fff',
                    fontSize: '13px',
                    cursor: 'default',
                    height: '36px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🇲🇽</span>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ color: '#6d7175' }}>
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  style={{ ...inputStyle, width: '140px' }}
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '16px 24px 20px',
            borderTop: '1px solid #e1e3e5',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 20px',
              border: '1px solid #c9cccf',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#303030',
            }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!empresa.trim() || saving}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px',
              background: empresa.trim() && !saving ? '#1a1a1a' : '#8c8c8c',
              fontSize: '14px',
              fontWeight: 600,
              cursor: empresa.trim() && !saving ? 'pointer' : 'default',
              color: '#fff',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
