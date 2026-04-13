/**
 * Type declarations for the Web Serial API.
 * @see https://wicg.github.io/serial/
 */

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: ParityType;
  bufferSize?: number;
  flowControl?: FlowControlType;
}

type ParityType = 'none' | 'even' | 'odd';
type FlowControlType = 'none' | 'hardware';

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
  removeEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
}

interface Serial extends EventTarget {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
  removeEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
}

interface Navigator {
  readonly serial: Serial;
}
