import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/StatusBadge'
import { formatRelativeTime, formatCurrency } from '../../lib/helpers'
import type { Referral, Professional } from '../../types/database'

type Tab = 'all' | 'sent' | 'received'
type StatusFilter = 'all' | 'sent' | 'viewed' | 'contacted' | 'quoted' | 'converted' | 'lost'

interface ReferralWithPartner extends Referral {
  partner: Professional | null
  direction: 'sent' | 'received'
}

export function ReferralsList() {
  const { professional } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [referrals, setReferrals] = useState<ReferralWithPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!professional) return

    async function fetchReferrals() {
      setLoading(true)
      try {
        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .or(`sender_id.eq.${professional!.id},receiver_id.eq.${professional!.id}`)
          .order('created_at', { ascending: false })

        if (!referralData || referralData.length === 0) {
          setReferrals([])
          return
        }

        const partnerIds = Array.from(
          new Set(
            referralData.map(r =>
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

        const enriched: ReferralWithPartner[] = referralData.map(r => {
          const isSent = r.sender_id === professional!.id
          const partnerId = isSent ? r.receiver_id : r.sender_id
          return {
            ...r,
            partner: partnersMap.get(partnerId) ?? null,
            direction: isSent ? 'sent' : 'received',
          }
        })

        setReferrals(enriched)
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [professional])

  const filtered = referrals.filter(r => {
    const tabMatch =
      activeTab === 'all' ||
      (activeTab === 'sent' && r.direction === 'sent') ||
      (activeTab === 'received' && r.direction === 'received')
    const statusMatch = statusFilter === 'all' || r.status === statusFilter
    return tabMatch && statusMatch
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'received', label: 'Received' },
  ]

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'sent', label: 'Sent' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ]

  return (
    <div className="min-h-screen bg-surface pb-10">
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Referrals</p>
            <h1 className="text-2xl font-bold text-slate-text mt-0.5">All Referrals</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow">
            <FileText className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-md p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors min-h-[40px] ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-text hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-text shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl shadow-md bg-white p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-text">No referrals found</p>
            <p className="text-sm text-slate-500">
              {activeTab === 'sent'
                ? "You haven't sent any referrals yet."
                : activeTab === 'received'
                ? "You haven't received any referrals yet."
                : 'No referrals match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl shadow-md bg-white divide-y divide-slate-100 overflow-hidden">
            {filtered.map(referral => {
              const isSent = referral.direction === 'sent'
              const clientName = `${referral.client_first_name} ${referral.client_last_name}`
              const partnerName = referral.partner?.full_name ?? 'Unknown'

              return (
                <Link
                  key={referral.id}
                  to={`/app/referrals/${referral.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
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

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-text truncate">{clientName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {isSent ? `To ${partnerName}` : `From ${partnerName}`}
                    </p>
                    {referral.status === 'converted' && referral.commission_amount != null && (
                      <p className="text-xs text-accent font-semibold mt-0.5">
                        Commission: {formatCurrency(referral.commission_amount)}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={referral.status} />
                    <span className="text-xs text-slate-400">{formatRelativeTime(referral.created_at)}</span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 ml-1" />
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
