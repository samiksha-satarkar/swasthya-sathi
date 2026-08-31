-- ============================================================
-- SwasthyaSathi · Migration 001: Phone Auth Setup Notes
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- IMPORTANT: Phone OTP auth requires configuration in the Supabase Dashboard:
--
-- 1. Go to: Supabase Dashboard → Authentication → Providers
-- 2. Enable "Phone" provider
-- 3. Configure an SMS provider (Twilio, MessageBird, or Vonage):
--    - For Twilio: Enter your Account SID, Auth Token, and Messaging Service SID
--    - For testing: Supabase offers a built-in test mode (rate-limited)
--
-- 4. Optionally enable "Confirm phone" under Authentication → Settings
--    to require phone verification before access.
--
-- No SQL schema changes are needed for basic phone auth —
-- Supabase's auth.users table handles phone numbers automatically.
--
-- After enabling phone auth, users can sign in via:
--   supabase.auth.signInWithOtp({ phone: '+919876543210' })
--   supabase.auth.verifyOtp({ phone: '+919876543210', token: '123456', type: 'sms' })
--

-- ── OPTIONAL: Link asha_workers to auth.users ──
-- This adds a user_id column so we can map the authenticated user
-- to their ASHA worker profile. Will be used in Task 2 for RLS.

ALTER TABLE asha_workers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asha_user_id ON asha_workers (user_id);
