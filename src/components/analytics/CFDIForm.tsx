'use client';

import { useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Button,
  Banner,
  Box,
  Divider,
} from '@shopify/polaris';
import { generateCFDI } from '@/app/actions/analytics-advanced-actions';
import type { CFDIRecord, CFDIRequest } from '@/types';
import { CFDI_USOS, CFDI_REGIMENES } from '@/types';

interface CFDIFormProps {
  saleId: string;
  saleFolio: string;
  saleTotal: number;
  onComplete?: (record: CFDIRecord) => void;
}

export function CFDIForm({ saleId, saleFolio, saleTotal, onComplete }: CFDIFormProps) {
  const [rfc, setRfc] = useState('');
  const [nombre, setNombre] = useState('');
  const [regimen, setRegimen] = useState('626');
  const [domicilio, setDomicilio] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CFDIRecord | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!rfc || !nombre || !domicilio) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    if (!rfcRegex.test(rfc.toUpperCase())) {
      setError('El RFC tiene un formato inválido.');
      return;
    }

    setLoading(true);
    try {
      const request: CFDIRequest = {
        saleId,
        receptorRfc: rfc.toUpperCase(),
        receptorNombre: nombre,
        receptorRegimenFiscal: regimen,
        receptorDomicilioFiscal: domicilio,
        usoCfdi,
      };

      const record = await generateCFDI(request);
      setResult(record);
      onComplete?.(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar CFDI');
    } finally {
      setLoading(false);
    }
  };

  if (result && result.status === 'timbrada') {
    return (
      <Card>
        <BlockStack gap="300">
          <Banner tone="success">CFDI generado exitosamente</Banner>
          <Text variant="bodyMd" as="p"><strong>UUID:</strong> {result.uuid}</Text>
          <Text variant="bodyMd" as="p"><strong>Folio:</strong> {result.folio}</Text>
          <Text variant="bodyMd" as="p"><strong>Total:</strong> ${result.total.toFixed(2)}</Text>
          <InlineStack gap="200">
            {result.xmlUrl && (
              <Button url={result.xmlUrl} external>Descargar XML</Button>
            )}
            {result.pdfUrl && (
              <Button url={result.pdfUrl} external variant="primary">Descargar PDF</Button>
            )}
          </InlineStack>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Facturar venta {saleFolio} — ${saleTotal.toFixed(2)}
        </Text>

        {error && <Banner tone="critical">{error}</Banner>}

        {result?.uuid === 'PAC_NOT_CONFIGURED' && (
          <Banner tone="warning">
            PAC no configurado. Para habilitar facturación electrónica, configura las variables 
            de entorno CFDI_PAC_URL, CFDI_PAC_USER y CFDI_PAC_PASSWORD con tu proveedor de timbrado.
          </Banner>
        )}

        <Divider />

        <Text variant="headingSm" as="h4">Datos del receptor</Text>

        <TextField
          label="RFC"
          value={rfc}
          onChange={setRfc}
          placeholder="XAXX010101000"
          maxLength={13}
          autoComplete="off"
        />
        <TextField
          label="Razón social"
          value={nombre}
          onChange={setNombre}
          placeholder="NOMBRE O RAZON SOCIAL"
          autoComplete="off"
        />
        <TextField
          label="Domicilio fiscal (C.P.)"
          value={domicilio}
          onChange={setDomicilio}
          placeholder="00000"
          maxLength={5}
          autoComplete="off"
        />
        <Select
          label="Régimen fiscal"
          options={CFDI_REGIMENES.map((r) => ({
            label: `${r.clave} — ${r.descripcion}`,
            value: r.clave,
          }))}
          value={regimen}
          onChange={setRegimen}
        />
        <Select
          label="Uso del CFDI"
          options={CFDI_USOS.map((u) => ({
            label: `${u.clave} — ${u.descripcion}`,
            value: u.clave,
          }))}
          value={usoCfdi}
          onChange={setUsoCfdi}
        />

        <InlineStack align="end">
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Generar CFDI
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
