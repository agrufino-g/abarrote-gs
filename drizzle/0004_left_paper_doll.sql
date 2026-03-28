CREATE TABLE "cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"corte_id" text,
	"tipo" text NOT NULL,
	"concepto" text NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"cajero" text NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devolucion_items" (
	"id" text PRIMARY KEY NOT NULL,
	"devolucion_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"regreso_inventario" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devoluciones" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"sale_folio" text NOT NULL,
	"tipo" text DEFAULT 'parcial' NOT NULL,
	"motivo" text NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"monto_devuelto" numeric(10, 2) NOT NULL,
	"metodo_dev" text DEFAULT 'efectivo' NOT NULL,
	"cajero" text NOT NULL,
	"cliente_id" text,
	"fecha" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"cliente_name" text NOT NULL,
	"tipo" text NOT NULL,
	"puntos" numeric(10, 2) NOT NULL,
	"saldo_anterior" numeric(10, 2) NOT NULL,
	"saldo_nuevo" numeric(10, 2) NOT NULL,
	"sale_id" text,
	"sale_folio" text,
	"notas" text DEFAULT '' NOT NULL,
	"cajero" text NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mercadopago_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"status" text NOT NULL,
	"external_reference" text,
	"amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mercadopago_payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_purchase" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_discount" numeric(10, 2),
	"applicable_to" text DEFAULT 'all' NOT NULL,
	"applicable_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "changes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "changes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" text DEFAULT 'pieza' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_multiple" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_records" ADD COLUMN "discount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_records" ADD COLUMN "discount_type" text DEFAULT 'amount' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "prices_include_iva" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "ticket_template_venta" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "ticket_template_proveedor" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "inventory_general_columns" text DEFAULT '["title","sku","available","onHand"]' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "default_margin" text DEFAULT '30' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "default_starting_fund" numeric(10, 2) DEFAULT '500' NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_corte_id_cortes_caja_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes_caja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucion_items" ADD CONSTRAINT "devolucion_items_devolucion_id_devoluciones_id_fk" FOREIGN KEY ("devolucion_id") REFERENCES "public"."devoluciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucion_items" ADD CONSTRAINT "devolucion_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_sale_id_sale_records_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_sale_id_sale_records_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devolucion_items_devolucion_id_idx" ON "devolucion_items" USING btree ("devolucion_id");--> statement-breakpoint
CREATE INDEX "devoluciones_sale_id_idx" ON "devoluciones" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "devoluciones_fecha_idx" ON "devoluciones" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_cliente_id_idx" ON "loyalty_transactions" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_fecha_idx" ON "loyalty_transactions" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "promotions_active_idx" ON "promotions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "promotions_dates_idx" ON "promotions" USING btree ("start_date","end_date");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_role_definitions_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "cortes_caja_fecha_idx" ON "cortes_caja" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "fiado_items_fiado_id_idx" ON "fiado_items" USING btree ("fiado_id");--> statement-breakpoint
CREATE INDEX "fiado_transactions_cliente_id_idx" ON "fiado_transactions" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "fiado_transactions_date_idx" ON "fiado_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "gastos_fecha_idx" ON "gastos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "gastos_categoria_idx" ON "gastos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "inventory_audit_items_audit_id_idx" ON "inventory_audit_items" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "merma_records_product_id_idx" ON "merma_records" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "merma_records_date_idx" ON "merma_records" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pedido_items_pedido_id_idx" ON "pedido_items" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_items_product_id_idx" ON "pedido_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sale_records_date_idx" ON "sale_records" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sale_records_payment_method_idx" ON "sale_records" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "user_roles_firebase_uid_idx" ON "user_roles" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");