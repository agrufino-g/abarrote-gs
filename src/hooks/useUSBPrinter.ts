import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useUSBPrinter() {
  const [printerDevice, setPrinterDevice] = useState<USBDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectPrinter = useCallback(async () => {
    if (!('usb' in navigator)) {
      throw new Error('WebUSB no soportado en este navegador. Usa Chrome/Edge.');
    }

    setIsConnecting(true);
    try {
      const device = await navigator.usb.requestDevice({
        filters: [{
          // Generic vendor filters could go here, or left empty to let user pick
        }]
      });

      await device.open();
      // Usually ESC/POS printers are on configuration 1, interface 0
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      setPrinterDevice(device);
      logger.info('USB Printer connected', { vendorId: device.vendorId });
      return device;
    } catch (err) {
      logger.error('Failed to connect USB printer', { error: err });
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const printCommand = useCallback(async (data: Uint8Array) => {
    if (!printerDevice) throw new Error('No hay impresora conectada');
    
    // Most printers use endpoint 1 for out
    const endpoints = printerDevice.configuration?.interfaces[0].alternate.endpoints;
    const outEndpoint = endpoints?.find(e => e.direction === 'out');
    
    if (!outEndpoint) {
      throw new Error('No se encontró el endpoint de salida');
    }

    try {
      await printerDevice.transferOut(outEndpoint.endpointNumber, data as unknown as BufferSource);
    } catch (err) {
      logger.error('Impresión USB falló', { error: err });
      throw err;
    }
  }, [printerDevice]);

  return {
    printerDevice,
    isConnecting,
    connectPrinter,
    printCommand
  };
}
