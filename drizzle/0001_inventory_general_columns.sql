ALTER TABLE "store_config"
ADD COLUMN IF NOT EXISTS "inventory_general_columns" text DEFAULT '["title","sku","available","onHand"]' NOT NULL;