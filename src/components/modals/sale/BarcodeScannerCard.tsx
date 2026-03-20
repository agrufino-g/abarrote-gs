'use client';

import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Button,
  TextField,
  Icon,
} from '@shopify/polaris';
import { BarcodeIcon } from '@shopify/polaris-icons';
import { CameraScanner } from '@/components/scanner/CameraScanner';

export interface BarcodeScannerCardProps {
  barcodeInput: string;
  onBarcodeInputChange: (value: string) => void;
  barcodeError: string;
  onScan: (code: string) => void;
}

export function BarcodeScannerCard({
  barcodeInput,
  onBarcodeInputChange,
  barcodeError,
  onScan,
}: BarcodeScannerCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={BarcodeIcon} />
          <Text as="h3" variant="headingSm">Escanear código de barras</Text>
        </InlineStack>

        <CameraScanner
          onScan={onScan}
          continuous
          buttonLabel="Escanear productos con camara"
        />

        <InlineStack gap="200" align="end" blockAlign="end">
          <Box minWidth="350px">
            <div onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.repeat || !barcodeInput.trim()) return;
                const code = barcodeInput;
                onBarcodeInputChange('');
                onScan(code);
              }
            }}>
              <TextField
                label="Código de barras"
                value={barcodeInput}
                onChange={(val) => {
                  onBarcodeInputChange(val);
                }}
                autoComplete="off"
                placeholder="Escanea o escribe el código de barras..."
                helpText="El escáner escribe el código y presiona Enter automáticamente"
                connectedRight={
                  <Button variant="primary" onClick={() => onScan(barcodeInput)} disabled={!barcodeInput.trim()}>
                    Buscar
                  </Button>
                }
                error={barcodeError || undefined}
              />
            </div>
          </Box>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
