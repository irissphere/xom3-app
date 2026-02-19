-- Enable RLS on user_profiles if not already enabled
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make this idempotent
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on first login)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access on profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');
