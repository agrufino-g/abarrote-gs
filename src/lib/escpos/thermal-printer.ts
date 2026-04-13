/**
 * ThermalPrinter — WebSerial driver for ESC/POS thermal printers.
 *
 * Provides connect/disconnect/print/openDrawer methods using the
 * Web Serial API (Chrome 89+, Edge 89+, Opera 75+).
 *
 * Usage:
 *   const printer = new ThermalPrinter();
 *   await printer.connect();
 *   await printer.print(escposBytes);
 *   await printer.openDrawer();
 *   printer.disconnect();
 */

export type PrinterStatus = 'disconnected' | 'connecting' | 'ready' | 'printing' | 'error';

export interface PrinterInfo {
  status: PrinterStatus;
  portName: string;
  error?: string;
}

type StatusListener = (info: PrinterInfo) => void;

export class ThermalPrinter {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private _status: PrinterStatus = 'disconnected';
  private _portName = '';
  private _error?: string;
  private listeners: Set<StatusListener> = new Set();

  /** Check if WebSerial API is available in this browser */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  get status(): PrinterStatus {
    return this._status;
  }

  get info(): PrinterInfo {
    return {
      status: this._status,
      portName: this._portName,
      error: this._error,
    };
  }

  /** Subscribe to status changes */
  onStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: PrinterStatus, error?: string): void {
    this._status = status;
    this._error = error;
    const info = this.info;
    for (const fn of this.listeners) fn(info);
  }

  /**
   * Open the serial port picker and connect to the selected printer.
   * The user MUST interact (click a button) before calling this — it requires
   * a user gesture for the browser permission prompt.
   */
  async connect(baudRate: number = 9600): Promise<boolean> {
    if (!ThermalPrinter.isSupported()) {
      this.setStatus('error', 'WebSerial no está disponible en este navegador. Usa Chrome o Edge.');
      return false;
    }

    try {
      this.setStatus('connecting');

      // Show the browser's port picker dialog
      const port = await navigator.serial.requestPort({
        filters: [], // No filter — accept any serial device
      });

      await port.open({ baudRate });

      this.port = port;
      this._portName = `Serial (${baudRate} baud)`;

      // Get a writer for sending data
      if (port.writable) {
        this.writer = port.writable.getWriter();
      }

      this.setStatus('ready');

      // Listen for disconnect
      port.addEventListener('disconnect', () => {
        this.handleDisconnect();
      });

      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        // User cancelled the picker — not an error
        this.setStatus('disconnected');
        return false;
      }

      const message = err instanceof Error ? err.message : 'Error desconocido al conectar';
      this.setStatus('error', message);
      return false;
    }
  }

  /** Disconnect from the printer */
  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      // Ignore close errors
    }
    this._portName = '';
    this.setStatus('disconnected');
  }

  /** Send raw ESC/POS bytes to the printer */
  async print(data: Uint8Array): Promise<boolean> {
    if (!this.writer || this._status !== 'ready') {
      this.setStatus('error', 'Impresora no conectada');
      return false;
    }

    try {
      this.setStatus('printing');

      // Send in chunks to avoid buffer overflow on slower printers
      const CHUNK_SIZE = 512;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.length));
        await this.writer.write(chunk);
      }

      this.setStatus('ready');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir';
      this.setStatus('error', message);
      return false;
    }
  }

  private handleDisconnect(): void {
    this.writer = null;
    this.port = null;
    this._portName = '';
    this.setStatus('disconnected');
  }

  /** Destroy — release all resources */
  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}
