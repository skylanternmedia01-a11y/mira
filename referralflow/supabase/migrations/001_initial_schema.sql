-- Referio Initial Schema
-- Run this in Supabase SQL Editor

-- Users / Professionals
CREATE TABLE professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  auth_user_id UUID REFERENCES auth.users(id) UNIQUE,

  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  profession TEXT NOT NULL,
  profession_other TEXT,
  business_name TEXT NOT NULL,
  suburb TEXT,
  state TEXT,
  abn TEXT,

  username TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,

  referrals_sent_count INTEGER DEFAULT 0,
  referrals_received_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  total_commission_earned NUMERIC DEFAULT 0,
  total_commission_owed NUMERIC DEFAULT 0
);

-- Partner Connections
CREATE TABLE connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  professional_a_id UUID NOT NULL REFERENCES professionals(id),
  professional_b_id UUID NOT NULL REFERENCES professionals(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'removed')),
  initiated_by UUID NOT NULL REFERENCES professionals(id),

  UNIQUE(professional_a_id, professional_b_id)
);

-- Commission Agreements
CREATE TABLE commission_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  referrer_id UUID NOT NULL REFERENCES professionals(id),
  receiver_id UUID NOT NULL REFERENCES professionals(id),

  commission_type TEXT NOT NULL CHECK (commission_type IN ('flat', 'percentage')),
  commission_amount NUMERIC NOT NULL,
  notes TEXT,

  proposed_by UUID NOT NULL REFERENCES professionals(id),
  confirmed_by_referrer BOOLEAN DEFAULT false,
  confirmed_by_receiver BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'active', 'superseded'))
);

-- Referrals
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  sender_id UUID NOT NULL REFERENCES professionals(id),
  receiver_id UUID NOT NULL REFERENCES professionals(id),

  client_first_name TEXT NOT NULL,
  client_last_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  context TEXT NOT NULL,

  consent_captured BOOLEAN DEFAULT true,
  consent_timestamp TIMESTAMPTZ DEFAULT now(),
  client_opted_out BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'contacted', 'quoted', 'converted', 'lost')),
  viewed_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  quoted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,

  deal_value NUMERIC,
  commission_amount NUMERIC,
  commission_agreement_id UUID REFERENCES commission_agreements(id),

  sender_notes TEXT,
  receiver_notes TEXT,

  client_sms_sent BOOLEAN DEFAULT false,
  client_sms_sent_at TIMESTAMPTZ,
  receiver_sms_sent BOOLEAN DEFAULT false,
  receiver_sms_sent_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Professionals policies
CREATE POLICY "Anyone can read professionals" ON professionals
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON professionals
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Auth users can insert own profile" ON professionals
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Connections policies
CREATE POLICY "Connection parties can read" ON connections
  FOR SELECT USING (
    professional_a_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR professional_b_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Auth users can insert connections" ON connections
  FOR INSERT WITH CHECK (
    initiated_by IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Connection parties can update" ON connections
  FOR UPDATE USING (
    professional_a_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR professional_b_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Commission agreements policies
CREATE POLICY "Agreement parties can read" ON commission_agreements
  FOR SELECT USING (
    referrer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Auth users can insert agreements" ON commission_agreements
  FOR INSERT WITH CHECK (
    proposed_by IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Agreement parties can update" ON commission_agreements
  FOR UPDATE USING (
    referrer_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Referrals policies
CREATE POLICY "Referral parties can read" ON referrals
  FOR SELECT USING (
    sender_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Auth users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Referral parties can update" ON referrals
  FOR UPDATE USING (
    sender_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Notifications policies
CREATE POLICY "Own notifications read" ON notifications
  FOR SELECT USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Auth users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Own notifications update" ON notifications
  FOR UPDATE USING (
    professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_professionals_auth_user ON professionals(auth_user_id);
CREATE INDEX idx_professionals_username ON professionals(username);
CREATE INDEX idx_connections_a ON connections(professional_a_id);
CREATE INDEX idx_connections_b ON connections(professional_b_id);
CREATE INDEX idx_referrals_sender ON referrals(sender_id);
CREATE INDEX idx_referrals_receiver ON referrals(receiver_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created ON referrals(created_at DESC);
CREATE INDEX idx_notifications_professional ON notifications(professional_id);
CREATE INDEX idx_notifications_unread ON notifications(professional_id, read) WHERE read = false;
CREATE INDEX idx_agreements_referrer ON commission_agreements(referrer_id);
CREATE INDEX idx_agreements_receiver ON commission_agreements(receiver_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agreements_updated_at
  BEFORE UPDATE ON commission_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update denormalized stats on referral insert
CREATE OR REPLACE FUNCTION update_referral_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE professionals SET referrals_sent_count = referrals_sent_count + 1 WHERE id = NEW.sender_id;
    UPDATE professionals SET referrals_received_count = referrals_received_count + 1 WHERE id = NEW.receiver_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'converted' AND OLD.status != 'converted' THEN
    UPDATE professionals SET conversions_count = conversions_count + 1 WHERE id = NEW.receiver_id;
    IF NEW.commission_amount IS NOT NULL THEN
      UPDATE professionals SET total_commission_earned = total_commission_earned + NEW.commission_amount WHERE id = NEW.sender_id;
      UPDATE professionals SET total_commission_owed = total_commission_owed + NEW.commission_amount WHERE id = NEW.receiver_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER referral_counts_trigger
  AFTER INSERT OR UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_referral_counts();
