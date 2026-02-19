-- ============================================================
-- Affiliate Marketing Program Schema
-- ============================================================

-- Add affiliate_code column to orders table for attribution
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

-- ── Affiliate Profiles ──
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'silver', 'gold', 'diamond')),
  total_sales_cents BIGINT NOT NULL DEFAULT 0,
  total_commission_cents BIGINT NOT NULL DEFAULT 0,
  payout_method TEXT DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal', 'store_credit')),
  stripe_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Affiliate Links ──
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES spacebaddie_products(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  commission_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Affiliate Commissions ──
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES spacebaddie_products(id) ON DELETE SET NULL,
  order_total_cents BIGINT NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  commission_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_user_id ON affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_user ON affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code ON orders(affiliate_code);

-- ── RLS Policies ──
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Affiliates can read their own profile
CREATE POLICY "affiliate_profiles_select_own" ON affiliate_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Affiliates can update their own profile (payout method, etc.)
CREATE POLICY "affiliate_profiles_update_own" ON affiliate_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Affiliates can read their own links
CREATE POLICY "affiliate_links_select_own" ON affiliate_links
  FOR SELECT USING (auth.uid() = affiliate_user_id);

-- Affiliates can create links
CREATE POLICY "affiliate_links_insert_own" ON affiliate_links
  FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);

-- Affiliates can read their own commissions
CREATE POLICY "affiliate_commissions_select_own" ON affiliate_commissions
  FOR SELECT USING (auth.uid() = affiliate_user_id);

-- Service role bypass for all tables (webhook/API operations)
CREATE POLICY "affiliate_profiles_service" ON affiliate_profiles
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "affiliate_links_service" ON affiliate_links
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "affiliate_commissions_service" ON affiliate_commissions
  FOR ALL USING (auth.role() = 'service_role');
