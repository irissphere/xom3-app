-- Marketplace sellers table for multi-vendor commerce
CREATE TABLE IF NOT EXISTS marketplace_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  store_name text NOT NULL,
  stripe_account_id text,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.1500,
  status text NOT NULL DEFAULT 'draft',
  total_sales_cents bigint NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  bio text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_email ON marketplace_sellers(email);
CREATE INDEX IF NOT EXISTS idx_marketplace_sellers_status ON marketplace_sellers(status);

-- Add seller_id to products so we know who listed it
DO $$ BEGIN
  ALTER TABLE spacebaddie_products ADD COLUMN seller_id uuid REFERENCES marketplace_sellers(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add supplier metadata columns to products
DO $$ BEGIN
  ALTER TABLE spacebaddie_products ADD COLUMN supplier_sku text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE spacebaddie_products ADD COLUMN supplier_source text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
