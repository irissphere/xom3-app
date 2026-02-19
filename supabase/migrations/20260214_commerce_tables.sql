-- ============================================================================
-- XOM3 Commerce Tables Migration
-- Created: 2026-02-14
-- Description: Core commerce schema — orders, order items, cart, product
--              extensions, RLS policies, indexes, and updated_at triggers.
-- ============================================================================

-- ROLLBACK (uncomment to revert):
-- DROP TRIGGER IF EXISTS orders_updated_at ON orders;
-- DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
-- DROP TABLE IF EXISTS cart_items;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;

-- ============================================================================
-- 1. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. CART ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id),
  UNIQUE(session_id, product_id)
);

-- ============================================================================
-- 4. EXTEND spacebaddie_products WITH COMMERCE FIELDS
-- ============================================================================
DO $$
BEGIN
  -- inventory_count: -1 = unlimited
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spacebaddie_products' AND column_name = 'inventory_count'
  ) THEN
    ALTER TABLE spacebaddie_products ADD COLUMN inventory_count INTEGER DEFAULT -1;
  END IF;

  -- sku
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spacebaddie_products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE spacebaddie_products ADD COLUMN sku TEXT;
  END IF;

  -- shipping_required
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spacebaddie_products' AND column_name = 'shipping_required'
  ) THEN
    ALTER TABLE spacebaddie_products ADD COLUMN shipping_required BOOLEAN DEFAULT false;
  END IF;

  -- weight_grams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spacebaddie_products' AND column_name = 'weight_grams'
  ) THEN
    ALTER TABLE spacebaddie_products ADD COLUMN weight_grams INTEGER;
  END IF;
END $$;

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5a. RLS POLICIES — orders
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_select_own'
  ) THEN
    CREATE POLICY orders_select_own ON orders
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_insert_own'
  ) THEN
    CREATE POLICY orders_insert_own ON orders
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_service_role_all'
  ) THEN
    CREATE POLICY orders_service_role_all ON orders
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 5b. RLS POLICIES — order_items
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'order_items_select_own'
  ) THEN
    CREATE POLICY order_items_select_own ON order_items
      FOR SELECT
      USING (
        order_id IN (
          SELECT id FROM orders WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'order_items_service_role_all'
  ) THEN
    CREATE POLICY order_items_service_role_all ON order_items
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 5c. RLS POLICIES — cart_items
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'cart_items_select_own'
  ) THEN
    CREATE POLICY cart_items_select_own ON cart_items
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'cart_items_insert_own'
  ) THEN
    CREATE POLICY cart_items_insert_own ON cart_items
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'cart_items_update_own'
  ) THEN
    CREATE POLICY cart_items_update_own ON cart_items
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'cart_items_delete_own'
  ) THEN
    CREATE POLICY cart_items_delete_own ON cart_items
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'cart_items_service_role_all'
  ) THEN
    CREATE POLICY cart_items_service_role_all ON cart_items
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 5d. RLS POLICIES — user_profiles (add if table exists but policies missing)
-- ============================================================================
DO $$ BEGIN
  -- Only add policies if the user_profiles table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_profiles'
  ) THEN
    -- Enable RLS (idempotent)
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_select_own'
    ) THEN
      CREATE POLICY user_profiles_select_own ON user_profiles
        FOR SELECT
        USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_update_own'
    ) THEN
      CREATE POLICY user_profiles_update_own ON user_profiles
        FOR UPDATE
        USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_service_role_all'
    ) THEN
      CREATE POLICY user_profiles_service_role_all ON user_profiles
        FOR ALL
        USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 6. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);

-- ============================================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'orders_updated_at' AND event_object_table = 'orders'
  ) THEN
    CREATE TRIGGER orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Apply trigger to cart_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'cart_items_updated_at' AND event_object_table = 'cart_items'
  ) THEN
    CREATE TRIGGER cart_items_updated_at
      BEFORE UPDATE ON cart_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to confirm migration)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('orders', 'order_items', 'cart_items');
--
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('orders', 'order_items', 'cart_items');
--
-- SELECT indexname FROM pg_indexes
--   WHERE tablename IN ('orders', 'order_items', 'cart_items');
--
-- SELECT tablename, policyname FROM pg_policies
--   WHERE tablename IN ('orders', 'order_items', 'cart_items', 'user_profiles');
