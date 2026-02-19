-- Track where products are listed (TikTok via CJ, Facebook Marketplace, Amazon, etc.)
CREATE TABLE IF NOT EXISTS product_channel_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES spacebaddie_products(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('tiktok_cj', 'facebook', 'amazon')),
  external_id text,
  listed_at timestamptz NOT NULL DEFAULT now(),
  sync_status text NOT NULL DEFAULT 'listed' CHECK (sync_status IN ('pending', 'listed', 'synced', 'error')),
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_product_channel_listings_product ON product_channel_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_channel_listings_channel ON product_channel_listings(channel);

ALTER TABLE product_channel_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to product_channel_listings"
  ON product_channel_listings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE product_channel_listings IS 'Tracks which products are listed on TikTok (via CJ), Facebook Marketplace, Amazon.';
