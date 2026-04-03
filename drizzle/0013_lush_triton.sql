CREATE TABLE "mercadopago_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"mp_payment_id" text NOT NULL,
	"mp_refund_id" text NOT NULL,
	"sale_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"initiated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "mercadopago_refunds_mp_refund_id_unique" UNIQUE("mp_refund_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"code_verifier" text NOT NULL,
	"state" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "oauth_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
CREATE TABLE "payment_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_charge_id" text NOT NULL,
	"sale_id" text,
	"store_id" text DEFAULT 'main' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"reference_number" text,
	"clabe_reference" text,
	"oxxo_barcode" text,
	"oxxo_reference" text,
	"expires_at" timestamp,
	"paid_at" timestamp,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"store_id" text DEFAULT 'main' NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"public_key" text,
	"token_expires_at" timestamp,
	"mp_user_id" text,
	"mp_email" text,
	"webhook_secret_enc" text,
	"provider_account_id" text,
	"provider_email" text,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"scopes" text,
	"connected_at" timestamp,
	"disconnected_at" timestamp,
	"last_refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "sale_id" text;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "payment_method_id" text;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "payment_type" text;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "installments" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "fee_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "net_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "payer_email" text;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "sale_records" ADD COLUMN "installments" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_records" ADD COLUMN "mp_payment_id" text;--> statement-breakpoint
ALTER TABLE "sale_records" ADD COLUMN "status" text DEFAULT 'completada' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "clabe_number" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "paypal_username" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "cobrar_qr_url" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "mp_device_id" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "mp_public_key" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "mp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "conekta_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "conekta_public_key" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "stripe_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "stripe_public_key" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "clip_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "clip_api_key" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "clip_serial_number" text;--> statement-breakpoint
ALTER TABLE "mercadopago_refunds" ADD CONSTRAINT "mercadopago_refunds_sale_id_sale_records_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD CONSTRAINT "payment_provider_connections_store_id_store_config_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_refunds_sale_id_idx" ON "mercadopago_refunds" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "mp_refunds_payment_id_idx" ON "mercadopago_refunds" USING btree ("mp_payment_id");--> statement-breakpoint
CREATE INDEX "pc_provider_charge_idx" ON "payment_charges" USING btree ("provider","provider_charge_id");--> statement-breakpoint
CREATE INDEX "pc_sale_idx" ON "payment_charges" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "pc_status_idx" ON "payment_charges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pc_reference_idx" ON "payment_charges" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "ppc_provider_store_idx" ON "payment_provider_connections" USING btree ("provider","store_id");--> statement-breakpoint
CREATE INDEX "ppc_status_idx" ON "payment_provider_connections" USING btree ("status");--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD CONSTRAINT "mercadopago_payments_sale_id_sale_records_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_payments_sale_id_idx" ON "mercadopago_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "mp_payments_status_idx" ON "mercadopago_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mp_payments_external_ref_idx" ON "mercadopago_payments" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "sale_records_mp_payment_id_idx" ON "sale_records" USING btree ("mp_payment_id");--> statement-breakpoint
CREATE INDEX "sale_records_status_idx" ON "sale_records" USING btree ("status");