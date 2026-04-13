export { ThermalPrinter } from './thermal-printer';
export type { PrinterStatus, PrinterInfo } from './thermal-printer';
export { buildSaleTicket, buildCorteTicket, buildDrawerKick } from './ticket-builder';
export type { SaleTicketData, CorteTicketData, TicketItem } from './ticket-builder';
export {
  INIT,
  CUT_PARTIAL,
  CUT_FULL,
  DRAWER_KICK_PIN2,
  DRAWER_KICK_PIN5,
  encodeText,
  concatBytes,
  formatRow,
} from './commands';
