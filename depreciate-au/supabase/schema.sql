-- DepreciateAU Database Schema
-- Run this in the Supabase SQL editor to set up the database

-- Referrers table (must be created first due to FK reference)
CREATE TABLE referrers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- QS Firms (supply side)
CREATE TABLE qs_firms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  auth_user_id UUID REFERENCES auth.users(id),

  -- Profile
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  abn TEXT,
  aiqs_number TEXT,
  tpb_number TEXT,
  bio TEXT,

  -- Service details
  states_serviced TEXT[] DEFAULT '{}',
  property_types_serviced TEXT[] DEFAULT '{}',
  typical_turnaround TEXT,
  price_range TEXT,

  -- Platform
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  credit_balance NUMERIC DEFAULT 0,
  total_briefs_purchased INTEGER DEFAULT 0,

  -- Stripe
  stripe_customer_id TEXT
);

-- Briefs (the core marketplace object)
CREATE TABLE briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  status TEXT DEFAULT 'estimate_only' CHECK (status IN (
    'estimate_only',
    'brief_submitted',
    'claimed',
    'fully_claimed',
    'expired'
  )),

  slots_total INTEGER DEFAULT 3,
  slots_remaining INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ,

  -- Property details
  property_address TEXT NOT NULL,
  property_state TEXT NOT NULL,
  property_suburb TEXT,
  property_type TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor_area_sqm NUMERIC,
  floor_area_source TEXT DEFAULT 'estimated',
  year_built TEXT NOT NULL,
  construction_type TEXT,
  renovated TEXT,
  renovation_year TEXT,
  renovation_cost NUMERIC,
  kitchen_quality TEXT,
  bathroom_quality TEXT,
  flooring_type TEXT,
  air_conditioning TEXT,
  has_pool BOOLEAN DEFAULT false,
  has_solar BOOLEAN DEFAULT false,
  has_alarm BOOLEAN DEFAULT false,
  has_garage_door BOOLEAN DEFAULT false,
  has_built_in_wardrobes BOOLEAN DEFAULT false,
  has_dishwasher BOOLEAN DEFAULT false,
  has_blinds BOOLEAN DEFAULT false,
  is_rented BOOLEAN DEFAULT true,

  -- Investor details
  investor_name TEXT NOT NULL,
  investor_email TEXT NOT NULL,
  investor_phone TEXT,

  -- Referral
  referral_code TEXT,
  referrer_id UUID REFERENCES referrers(id),

  -- AI estimate
  ai_estimate JSONB NOT NULL
);

-- Brief purchases
CREATE TABLE brief_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  brief_id UUID NOT NULL REFERENCES briefs(id),
  qs_firm_id UUID NOT NULL REFERENCES qs_firms(id),
  amount_paid NUMERIC NOT NULL DEFAULT 75,
  stripe_payment_id TEXT,

  qs_status TEXT DEFAULT 'purchased' CHECK (qs_status IN (
    'purchased', 'contacted', 'quoted', 'engaged', 'completed', 'lost'
  )),
  qs_notes TEXT,

  UNIQUE(brief_id, qs_firm_id)
);

-- Email captures
CREATE TABLE estimate_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  brief_id UUID REFERENCES briefs(id),
  converted BOOLEAN DEFAULT false
);

-- Purchase brief slot function (handles race conditions with row locking)
CREATE OR REPLACE FUNCTION purchase_brief_slot(
  p_brief_id UUID,
  p_qs_firm_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_slots_remaining INTEGER;
  v_credit_balance NUMERIC;
BEGIN
  -- Lock the brief row
  SELECT slots_remaining INTO v_slots_remaining
  FROM briefs WHERE id = p_brief_id FOR UPDATE;

  IF v_slots_remaining IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brief not found');
  END IF;

  IF v_slots_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No slots remaining');
  END IF;

  -- Check QS hasn't already purchased
  IF EXISTS (SELECT 1 FROM brief_purchases WHERE brief_id = p_brief_id AND qs_firm_id = p_qs_firm_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already purchased this brief');
  END IF;

  -- Check credits
  SELECT credit_balance INTO v_credit_balance
  FROM qs_firms WHERE id = p_qs_firm_id FOR UPDATE;

  IF v_credit_balance < 75 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- Deduct credit
  UPDATE qs_firms
  SET credit_balance = credit_balance - 75,
      total_briefs_purchased = total_briefs_purchased + 1
  WHERE id = p_qs_firm_id;

  -- Create purchase record
  INSERT INTO brief_purchases (brief_id, qs_firm_id, amount_paid)
  VALUES (p_brief_id, p_qs_firm_id, 75);

  -- Update brief slots
  UPDATE briefs
  SET slots_remaining = slots_remaining - 1,
      status = CASE
        WHEN slots_remaining - 1 <= 0 THEN 'fully_claimed'
        ELSE 'claimed'
      END,
      updated_at = now()
  WHERE id = p_brief_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_captures ENABLE ROW LEVEL SECURITY;

-- Anon policies (public form submissions)
CREATE POLICY "Anon can insert briefs" ON briefs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can insert estimate_captures" ON estimate_captures FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can read referrers by code" ON referrers FOR SELECT USING (true);
CREATE POLICY "Anon can insert qs_firms" ON qs_firms FOR INSERT WITH CHECK (true);

-- Authenticated QS users
CREATE POLICY "QS can read own firm" ON qs_firms FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "QS can update own firm" ON qs_firms FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "QS can read available briefs summary" ON briefs FOR SELECT USING (
  status IN ('brief_submitted', 'claimed') AND slots_remaining > 0
);

CREATE POLICY "QS can read purchased briefs" ON brief_purchases FOR SELECT USING (
  qs_firm_id IN (SELECT id FROM qs_firms WHERE auth_user_id = auth.uid())
);

CREATE POLICY "QS can update own purchases" ON brief_purchases FOR UPDATE USING (
  qs_firm_id IN (SELECT id FROM qs_firms WHERE auth_user_id = auth.uid())
);

-- Service role has full access (used by admin)
-- Service role bypasses RLS by default in Supabase
