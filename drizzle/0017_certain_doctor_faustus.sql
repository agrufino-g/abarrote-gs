ALTER TABLE "gastos" ADD COLUMN "comprobante_url" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "ticket_design_venta" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "ticket_design_corte" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "ticket_design_proveedor" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_idle_animation" text DEFAULT 'fade' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_transition_speed" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_promo_animation" text DEFAULT 'slideUp' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_show_clock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_theme" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_idle_carousel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_carousel_interval" text DEFAULT '5' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_logo" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_font_scale" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_auto_return_sec" text DEFAULT '6' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_accent_color" text;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_sound_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_orientation" text DEFAULT 'landscape' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_config" ADD COLUMN "customer_display_message_style" text;