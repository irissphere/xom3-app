-- ============================================================================
-- Fix: Allow NULL user_id on spacebaddie_products
-- Created: 2026-02-15
-- Description: The commerce admin flow creates products without an
--              authenticated user session, so user_id must be nullable.
-- ============================================================================

ALTER TABLE spacebaddie_products ALTER COLUMN user_id DROP NOT NULL;
