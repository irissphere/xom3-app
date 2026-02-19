-- ============================================================================
-- Commerce Orders Schema Alignment
-- Created: 2026-02-15
-- Description: Add missing columns to orders table that the checkout and
--              webhook handlers depend on: paid_at, currency, source.
--              Also add stripe_payment_intent alias for backwards compat.
-- ============================================================================

-- ROLLBACK (uncomment to revert):
-- ALTER TABLE orders DROP COLUMN IF EXISTS paid_at;
-- ALTER TABLE orders DROP COLUMN IF EXISTS currency;
-- ALTER TABLE orders DROP COLUMN IF EXISTS source;

DO $$
BEGIN
  -- paid_at: timestamp when payment was confirmed via webhook
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;

  -- currency: ISO 4217 currency code (default USD)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'currency'
  ) THEN
    ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;

  -- source: where the order originated (e.g. 'xom3_commerce', 'spacebaddie')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'source'
  ) THEN
    ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'xom3_commerce';
  END IF;
END $$;
