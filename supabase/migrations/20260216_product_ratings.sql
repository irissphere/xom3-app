-- Product ratings for aggregateRating in shop feed (AI/search visibility)
-- Optional: when present, feed includes schema.org AggregateRating per product

CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES spacebaddie_products(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);

-- RLS: allow service role (feed) to read; allow authenticated to insert own
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read all ratings"
  ON product_ratings FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can insert own rating"
  ON product_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMENT ON TABLE product_ratings IS 'Optional ratings for shop products; used in /api/shop/feed for aggregateRating when data exists.';
