import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Send, ArrowUpRight, ArrowDownLeft, CheckCircle, DollarSign, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/StatusBadge'
import { formatRelativeTime, formatCurrency } from '../../lib/helpers'
import type { Referral, Professional } from '../../types/database'

interface ReferralWithPartner extends Referral {
  partner: Professional | null
  direction: 'sent' | 'received'
}

interface Stats {
  sent: number
  received: number
  conversions: number
  commissionEarned: number
}

export function Dashboard() {
  const { professional } = useAuth()
  const [stats, setStats] = useState<Stats>({ sent: 0, received: 0, conversions: 0, commissionEarned: 0 })
  const [recentReferrals, setRecentReferrals] = useState<ReferralWithPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!professional) return

    async function fetchData() {
      setLoading(true)
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // Fetch this month's referrals for stats
        const { data: monthReferrals } = await supabase
          .from('referrals')
          .select('*')
          .or(`sender_id.eq.${professional!.id},receiver_id.eq.${professional!.id}`)
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd)

        const sent = (monthReferrals ?? []).filter(r => r.sender_id === professional!.id).length
        const received = (monthReferrals ?? []).filter(r => r.receiver_id === professional!.id).length
        const conversions = (monthReferrals ?? []).filter(r => r.status === 'converted').length
        const commissionEarned = (monthReferrals ?? [])
          .filter(r => r.status === 'converted' && r.sender_id === professional!.id && r.commission_amount)
          .reduce((sum, r) => sum + (r.commission_amount ?? 0), 0)

        setStats({ sent, received, conversions, commissionEarned })

        // Fetch last 10 referrals for activity feed
        const { data: recentData } = await supabase
          .from('referrals')
          .select('*')
          .or(`sender_id.eq.${professional!.id},receiver_id.eq.${professional!.id}`)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!recentData || recentData.length === 0) {
          setRecentReferrals([])
          return
        }

        // Collect unique partner IDs
        const partnerIds = Array.from(
          new Set(
            recentData.map(r =>
              r.sender_id === professional!.id ? r.receiver_id : r.sender_id
            )
          )
        )

        const { data: partnersData } = await supabase
          .from('professionals')
          .select('*')
          .in('id', partnerIds)

        const partnersMap = new Map<string, Professional>(
          (partnersData ?? []).map(p => [p.id, p])
        )

        const enriched: ReferralWithPartner[] = recentData.map(r => {
          const isSent = r.sender_id === professional!.id
          const partnerId = isSent ? r.receiver_id : r.sender_id
          return {
            ...r,
            partner: partnersMap.get(partnerId) ?? null,
            direction: isSent ? 'sent' : 'received',
          }
        })

        setRecentReferrals(enriched)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [professional])

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = professional.full_name.split(' ')[0]

  const statCards = [
    {
      label: 'Referrals Sent',
      value: stats.sent,
      icon: ArrowUpRight,
      iconClass: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Referrals Received',
      value: stats.received,
      icon: ArrowDownLeft,
      iconClass: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Conversions',
      value: stats.conversions,
      icon: CheckCircle,
      iconClass: 'text-green-600 bg-green-100',
    },
    {
      label: 'Commission Earned',
      value: formatCurrency(stats.commissionEarned),
      icon: DollarSign,
      iconClass: 'text-accent bg-emerald-100',
    },
  ]

  return (
    <div className="min-h-screen bg-surface pb-10">
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-text mt-0.5">
              Welcome back, {firstName}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow">
            <Send className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">This Month</p>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, icon: Icon, iconClass }) => (
              <div key={label} className="rounded-xl shadow-md bg-white p-4 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-text leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          to="/app/send"
          className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-accent text-white rounded-xl font-semibold shadow-md text-base transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Plus className="w-5 h-5" />
          Send Referral
        </Link>

        {/* Recent Activity */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentReferrals.length === 0 ? (
            <div className="rounded-xl shadow-md bg-white p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-text">No referrals yet</p>
              <p className="text-sm text-slate-500">
                Send your first referral to get started — it only takes a few seconds.
              </p>
              <Link
                to="/app/send"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                <Plus className="w-4 h-4" />
                Send a referral
              </Link>
            </div>
          ) : (
            <div className="rounded-xl shadow-md bg-white divide-y divide-slate-100 overflow-hidden">
              {recentReferrals.map(referral => {
                const isSent = referral.direction === 'sent'
                const clientName = `${referral.client_first_name} ${referral.client_last_name}`
                const partnerName = referral.partner?.full_name ?? 'Unknown'

                return (
                  <Link
                    key={referral.id}
                    to={`/app/referrals/${referral.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    {/* Direction icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                        isSent ? 'bg-blue-100' : 'bg-purple-100'
                      }`}
                    >
                      {isSent ? (
                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-purple-600" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-text truncate">{clientName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {isSent ? `To ${partnerName}` : `From ${partnerName}`}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <StatusBadge status={referral.status} />
                      <span className="text-xs text-slate-400">{formatRelativeTime(referral.created_at)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
