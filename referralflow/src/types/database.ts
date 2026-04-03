export type Database = {
  public: {
    Tables: {
      professionals: {
        Row: Professional
        Insert: Omit<Professional, 'id' | 'created_at' | 'referrals_sent_count' | 'referrals_received_count' | 'conversions_count' | 'total_commission_earned' | 'total_commission_owed'>
        Update: Partial<Professional>
      }
      connections: {
        Row: Connection
        Insert: Omit<Connection, 'id' | 'created_at'>
        Update: Partial<Connection>
      }
      commission_agreements: {
        Row: CommissionAgreement
        Insert: Omit<CommissionAgreement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<CommissionAgreement>
      }
      referrals: {
        Row: Referral
        Insert: Omit<Referral, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Referral>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Notification>
      }
    }
  }
}

export interface Professional {
  id: string
  created_at: string
  auth_user_id: string
  full_name: string
  email: string
  phone: string
  profession: string
  profession_other: string | null
  business_name: string
  suburb: string | null
  state: string | null
  abn: string | null
  username: string
  qr_code_url: string | null
  referrals_sent_count: number
  referrals_received_count: number
  conversions_count: number
  total_commission_earned: number
  total_commission_owed: number
}

export interface Connection {
  id: string
  created_at: string
  professional_a_id: string
  professional_b_id: string
  status: 'pending' | 'active' | 'declined' | 'removed'
  initiated_by: string
}

export interface CommissionAgreement {
  id: string
  created_at: string
  updated_at: string
  referrer_id: string
  receiver_id: string
  commission_type: 'flat' | 'percentage'
  commission_amount: number
  notes: string | null
  proposed_by: string
  confirmed_by_referrer: boolean
  confirmed_by_receiver: boolean
  status: 'proposed' | 'active' | 'superseded'
}

export interface Referral {
  id: string
  created_at: string
  updated_at: string
  sender_id: string
  receiver_id: string
  client_first_name: string
  client_last_name: string
  client_phone: string
  client_email: string | null
  context: string
  consent_captured: boolean
  consent_timestamp: string
  client_opted_out: boolean
  status: 'sent' | 'viewed' | 'contacted' | 'quoted' | 'converted' | 'lost'
  viewed_at: string | null
  contacted_at: string | null
  quoted_at: string | null
  converted_at: string | null
  lost_at: string | null
  lost_reason: string | null
  deal_value: number | null
  commission_amount: number | null
  commission_agreement_id: string | null
  sender_notes: string | null
  receiver_notes: string | null
  client_sms_sent: boolean
  client_sms_sent_at: string | null
  receiver_sms_sent: boolean
  receiver_sms_sent_at: string | null
}

export interface Notification {
  id: string
  created_at: string
  professional_id: string
  type: 'new_referral' | 'connection_request' | 'status_update' | 'agreement_proposed' | 'conversion'
  title: string
  body: string
  link: string | null
  read: boolean
  read_at: string | null
}
