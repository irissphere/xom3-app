-- Add product_type column to distinguish fulfillment method
-- physical = ships to customer (dropship or self-fulfill)
-- digital = instant download after purchase
-- pod = print-on-demand (sent to Printful/Printify)
DO $$ BEGIN
  ALTER TABLE spacebaddie_products ADD COLUMN product_type text NOT NULL DEFAULT 'physical';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add digital file URL for digital products
DO $$ BEGIN
  ALTER TABLE spacebaddie_products ADD COLUMN digital_file_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add tracking fields to orders if not present
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN tracking_number text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN tracking_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN notes text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
