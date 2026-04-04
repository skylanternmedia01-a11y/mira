// NOTE: This admin dashboard uses the standard anon Supabase client for MVP.
// For production, replace with a service-role client or a secure server-side API route.
// RLS policies will need to allow admin reads, or use a service role key server-side.
// The password check here is purely client-side and suitable for MVP only — do not use
// in production without a proper authentication mechanism.

import { useState, useEffect } from 'react'
import {
  Users,
  Send,
  CheckCircle,
  TrendingUp,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/helpers'
import { StatusBadge } from '../../components/StatusBadge'
import type { Professional, Referral } from '../../types/database'

const ADMIN_PASSWORD = 'admin123' // ⚠️ Change this before deploying to production

interface AdminStats {
  totalProfessionals: number
  totalConnections: number
  totalReferrals: number
  referralsThisMonth: number
  conversions: number
  conversionRate: number
}

interface ReferralRow extends Referral {
  sender: Professional | null
  receiver: Professional | null
}

export function AdminDashboard() {
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [topReferrers, setTopReferrers] = useState<Professional[]>([])
  const [topConverters, setTopConverters] = useState<Professional[]>([])
  const [recentReferrals, setRecentReferrals] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authed) fetchAdminData()
  }, [authed])

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  async function fetchAdminData() {
    setLoading(true)
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: profCount },
        { count: connCount },
        { count: refCount },
        { count: refMonthCount },
        { count: convCount },
        { data: referrers },
        { data: converters },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('professionals').select('*', { count: 'exact', head: true }),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('referrals').select('*', { count: 'exact', head: true }),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
        supabase
          .from('professionals')
          .select('*')
          .order('referrals_sent_count', { ascending: false })
          .limit(5),
        supabase
          .from('professionals')
          .select('*')
          .order('conversions_count', { ascending: false })
          .limit(5),
        supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const total = refCount ?? 0
      const converted = convCount ?? 0

      setStats({
        totalProfessionals: profCount ?? 0,
        totalConnections: connCount ?? 0,
        totalReferrals: total,
        referralsThisMonth: refMonthCount ?? 0,
        conversions: converted,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      })

      setTopReferrers(referrers ?? [])
      setTopConverters(converters ?? [])

      // Enrich recent referrals with sender/receiver names
      if (recentData && recentData.length > 0) {
        const allIds = Array.from(
          new Set([
            ...recentData.map(r => r.sender_id),
            ...recentData.map(r => r.receiver_id),
          ])
        )
        const { data: profs } = await supabase
          .from('professionals')
          .select('*')
          .in('id', allIds)

        const profMap = new Map<string, Professional>((profs ?? []).map(p => [p.id, p]))

        setRecentReferrals(
          recentData.map(r => ({
            ...r,
            sender: profMap.get(r.sender_id) ?? null,
            receiver: profMap.get(r.receiver_id) ?? null,
          }))
        )
      } else {
        setRecentReferrals([])
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Password gate ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl shadow-md bg-white overflow-hidden">
            <div className="bg-primary px-6 py-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">Admin Access</p>
                <p className="text-blue-200 text-xs">Referio Dashboard</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  This is an MVP password check only. Replace with a proper auth mechanism before production use.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500">Admin Password</label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value)
                    setPasswordError(false)
                  }}
                  placeholder="Enter admin password"
                  className="w-full min-h-[48px] rounded-lg border border-slate-200 px-3 text-slate-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">Incorrect password. Try again.</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- Dashboard ---
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Professionals',
      value: stats.totalProfessionals,
      icon: Users,
      iconClass: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Active Connections',
      value: stats.totalConnections,
      icon: LinkIcon,
      iconClass: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Total Referrals',
      value: stats.totalReferrals,
      icon: Send,
      iconClass: 'text-indigo-600 bg-indigo-100',
    },
    {
      label: 'This Month',
      value: stats.referralsThisMonth,
      icon: TrendingUp,
      iconClass: 'text-yellow-600 bg-yellow-100',
    },
    {
      label: 'Conversions',
      value: stats.conversions,
      icon: CheckCircle,
      iconClass: 'text-green-600 bg-green-100',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      iconClass: 'text-accent bg-emerald-100',
    },
  ]

  return (
    <div className="min-h-screen bg-surface pb-12">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Internal</p>
            <h1 className="text-2xl font-bold text-slate-text">Admin Dashboard</h1>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs text-yellow-700 font-medium">MVP Mode</span>
          </div>
        </div>

        {/* Stat cards */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        {/* Top referrers + top converters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <LeaderboardCard title="Top 5 Referrers" professionals={topReferrers} metricKey="referrals_sent_count" metricLabel="sent" />
          <LeaderboardCard title="Top 5 Converters" professionals={topConverters} metricKey="conversions_count" metricLabel="conversions" />

        </div>

        {/* Recent activity */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Referrals (last 20)</p>

          {recentReferrals.length === 0 ? (
            <div className="rounded-xl shadow-md bg-white p-8 text-center">
              <p className="text-slate-400 text-sm">No referrals yet.</p>
            </div>
          ) : (
            <div className="rounded-xl shadow-md bg-white overflow-hidden">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentReferrals.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-text whitespace-nowrap">
                          {r.sender?.full_name ?? <span className="text-slate-400 italic">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {r.receiver?.full_name ?? <span className="text-slate-400 italic">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {r.client_first_name} {r.client_last_name}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {formatDate(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-slate-100">
                {recentReferrals.map(r => (
                  <div key={r.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-text truncate">
                        {r.client_first_name} {r.client_last_name}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.sender?.full_name ?? 'Unknown'} → {r.receiver?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function LeaderboardCard({
  title,
  professionals,
  metricKey,
  metricLabel,
}: {
  title: string
  professionals: Professional[]
  metricKey: 'referrals_sent_count' | 'conversions_count'
  metricLabel: string
}) {
  return (
    <div className="rounded-xl shadow-md bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-primary/5">
        <p className="font-semibold text-slate-text text-sm">{title}</p>
      </div>
      {professionals.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">No data yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {professionals.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-text truncate">{p.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{p.profession}</p>
              </div>
              <span className="flex-shrink-0 text-sm font-bold text-slate-text">
                {p[metricKey]}
                <span className="text-xs font-normal text-slate-400 ml-1">{metricLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
