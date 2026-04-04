CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"target_user_ids" text[] DEFAULT '{}' NOT NULL,
	"target_role_ids" text[] DEFAULT '{}' NOT NULL,
	"activate_at" timestamp,
	"deactivate_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "proveedores" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags" USING btree ("enabled");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_product_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_corte_id_idx" ON "cash_movements" USING btree ("corte_id");--> statement-breakpoint
CREATE INDEX "cash_movements_tipo_idx" ON "cash_movements" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "fiado_transactions_cliente_date_idx" ON "fiado_transactions" USING btree ("cliente_id","date");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_current_stock_idx" ON "products" USING btree ("current_stock");