-- Devoluciones (cabecera)
CREATE TABLE IF NOT EXISTS "devoluciones" (
  "id" text PRIMARY KEY NOT NULL,
  "sale_id" text NOT NULL REFERENCES "sale_records"("id"),
  "sale_folio" text NOT NULL,
  "tipo" text NOT NULL DEFAULT 'parcial',
  "motivo" text NOT NULL,
  "notas" text NOT NULL DEFAULT '',
  "monto_devuelto" numeric(10,2) NOT NULL,
  "metodo_dev" text NOT NULL DEFAULT 'efectivo',
  "cajero" text NOT NULL,
  "cliente_id" text REFERENCES "clientes"("id"),
  "fecha" timestamp NOT NULL DEFAULT now()
);

-- Devoluciones (items)
CREATE TABLE IF NOT EXISTS "devolucion_items" (
  "id" text PRIMARY KEY NOT NULL,
  "devolucion_id" text NOT NULL REFERENCES "devoluciones"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "products"("id"),
  "product_name" text NOT NULL,
  "sku" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" numeric(10,2) NOT NULL,
  "subtotal" numeric(10,2) NOT NULL,
  "regreso_inventario" boolean NOT NULL DEFAULT true
);

-- Movimientos de caja
CREATE TABLE IF NOT EXISTS "cash_movements" (
  "id" text PRIMARY KEY NOT NULL,
  "corte_id" text REFERENCES "cortes_caja"("id"),
  "tipo" text NOT NULL,
  "concepto" text NOT NULL,
  "monto" numeric(10,2) NOT NULL,
  "notas" text NOT NULL DEFAULT '',
  "cajero" text NOT NULL,
  "fecha" timestamp NOT NULL DEFAULT now()
);

-- Historial de puntos de lealtad
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "cliente_id" text NOT NULL REFERENCES "clientes"("id"),
  "cliente_name" text NOT NULL,
  "tipo" text NOT NULL,
  "puntos" numeric(10,2) NOT NULL,
  "saldo_anterior" numeric(10,2) NOT NULL,
  "saldo_nuevo" numeric(10,2) NOT NULL,
  "sale_id" text REFERENCES "sale_records"("id"),
  "sale_folio" text,
  "notas" text NOT NULL DEFAULT '',
  "cajero" text NOT NULL,
  "fecha" timestamp NOT NULL DEFAULT now()
);
