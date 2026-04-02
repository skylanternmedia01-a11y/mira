import { useState, useEffect, useCallback, Fragment } from 'react'
import { supabase } from '../lib/supabase'

// ─── Auth Gate ───────────────────────────────────────────────────────────────

function useAdminAuth() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const expectedUser = import.meta.env.VITE_ADMIN_USERNAME
    const expectedPass = import.meta.env.VITE_ADMIN_PASSWORD

    if (!expectedUser || !expectedPass) {
      setChecked(true)
      return
    }

    const username = window.prompt('Admin username')
    if (username === null) {
      setChecked(true)
      return
    }
    const password = window.prompt('Admin password')
    if (password === null) {
      setChecked(true)
      return
    }

    if (username === expectedUser && password === expectedPass) {
      setAuthed(true)
    }
    setChecked(true)
  }, [])

  return { authed, checked }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Briefs', 'QS Firms', 'Referrers', 'Email Captures']
const BRIEF_PRICE = 75

const STATUS_COLORS = {
  estimate_only: 'bg-gray-100 text-gray-700',
  brief_submitted: 'bg-blue-100 text-blue-700',
  claimed: 'bg-amber-100 text-amber-700',
  fully_claimed: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
}

const QS_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id) {
  if (!id) return '—'
  return typeof id === 'string' && id.length > 8 ? id.slice(0, 8) + '...' : id
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(
    amount
  )
}

function Badge({ label, colorClass }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${colorClass}`}>
      {label.replace(/_/g, ' ')}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between">
      <span className="text-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline ml-4">
          Retry
        </button>
      )}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy">{value}</p>
      {sub !== undefined && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ briefs, purchases, qsFirms, emailCaptures }) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const totalBriefs = briefs.length
  const briefsThisMonth = briefs.filter((b) => b.created_at >= startOfMonth).length

  const totalPurchased = purchases.length
  const purchasedThisMonth = purchases.filter((p) => p.created_at >= startOfMonth).length
  const revenueThisMonth = purchasedThisMonth * BRIEF_PRICE

  const pendingQS = qsFirms.filter((f) => f.status === 'pending').length
  const emailCount = emailCaptures.length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard label="Total Briefs" value={totalBriefs} sub={`${briefsThisMonth} this month`} />
      <StatCard label="Briefs Purchased" value={totalPurchased} sub={`${purchasedThisMonth} this month`} />
      <StatCard label="Revenue (this month)" value={formatCurrency(revenueThisMonth)} />
      <StatCard label="Pending QS Applications" value={pendingQS} />
      <StatCard label="Email Captures" value={emailCount} />
    </div>
  )
}

// ─── Briefs Tab ──────────────────────────────────────────────────────────────

function BriefsTab({ briefs, purchases }) {
  const [expandedId, setExpandedId] = useState(null)

  const purchasesByBrief = purchases.reduce((acc, p) => {
    const key = p.brief_id
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Address</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Slots</th>
            <th className="px-4 py-3">Referral</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {briefs.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No briefs found.
              </td>
            </tr>
          )}
          {briefs.map((b) => {
            const isExpanded = expandedId === b.id
            return (
              <Fragment key={b.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs">{truncateId(b.id)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.created_at)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{b.property_address || '—'}</td>
                  <td className="px-4 py-3">{b.property_state || '—'}</td>
                  <td className="px-4 py-3">{b.property_type || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge label={b.status || 'unknown'} colorClass={STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3">
                    {(b.slots_total || 3) - (b.slots_remaining ?? 3)}/{b.slots_total ?? 3}
                  </td>
                  <td className="px-4 py-3">{b.referral_code || '—'}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="bg-gray-50 px-6 py-5">
                      <BriefDetails brief={b} purchases={purchasesByBrief[b.id] || []} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BriefDetails({ brief, purchases }) {
  const fields = [
    ['ID', brief.id],
    ['Address', brief.property_address],
    ['State', brief.property_state],
    ['Property Type', brief.property_type],
    ['Year Built', brief.year_built],
    ['Bedrooms', brief.bedrooms],
    ['Bathrooms', brief.bathrooms],
    ['Investor', brief.investor_name],
    ['Email', brief.investor_email],
    ['Phone', brief.investor_phone],
    ['Status', brief.status],
    ['Referral Code', brief.referral_code || '—'],
    ['Created', formatDate(brief.created_at)],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-slate-dark break-all">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {brief.ai_estimate && (
        <div>
          <p className="text-xs text-gray-500 mb-1">AI Estimate (JSON)</p>
          <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-48">
            {typeof brief.ai_estimate === 'string'
              ? brief.ai_estimate
              : JSON.stringify(brief.ai_estimate, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-2">
          Purchased by QS Firms ({purchases.length})
        </p>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-400">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {purchases.map((p) => (
              <li key={p.id} className="flex gap-2">
                <span className="font-medium">{p.qs_firm_id ? truncateId(p.qs_firm_id) : '—'}</span>
                <span className="text-gray-400">|</span>
                <span>{formatDate(p.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── QS Firms Tab ────────────────────────────────────────────────────────────

function QSFirmsTab({ qsFirms, onUpdateStatus, actionLoading }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Business Name</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">States</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Credits</th>
            <th className="px-4 py-3">Purchased</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {qsFirms.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No QS firms found.
              </td>
            </tr>
          )}
          {qsFirms.map((f) => {
            const isExpanded = expandedId === f.id
            return (
              <Fragment key={f.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{f.business_name || '—'}</td>
                  <td className="px-4 py-3">{f.contact_name || '—'}</td>
                  <td className="px-4 py-3">{f.email || '—'}</td>
                  <td className="px-4 py-3">
                    {Array.isArray(f.states_serviced) ? f.states_serviced.join(', ') : f.states_serviced || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={f.status || 'unknown'}
                      colorClass={QS_STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-4 py-3">{f.credit_balance ?? 0}</td>
                  <td className="px-4 py-3">{f.total_briefs_purchased ?? 0}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {f.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => onUpdateStatus(f.id, 'active')}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-success text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          Approve
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => onUpdateStatus(f.id, 'suspended')}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="bg-gray-50 px-6 py-5">
                      <QSFirmDetails firm={f} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function QSFirmDetails({ firm }) {
  const fields = [
    ['ID', firm.id],
    ['Business Name', firm.business_name],
    ['Contact Name', firm.contact_name],
    ['Email', firm.email],
    ['Phone', firm.phone],
    ['ABN', firm.abn],
    ['TPB Number', firm.tpb_number],
    ['AIQS Number', firm.aiqs_number],
    ['States Covered', Array.isArray(firm.states_serviced) ? firm.states_serviced.join(', ') : firm.states_serviced],
    ['Status', firm.status],
    ['Credits', firm.credit_balance],
    ['Created', formatDate(firm.created_at)],
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-slate-dark break-all">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Referrers Tab ───────────────────────────────────────────────────────────

function ReferrersTab({ referrers, briefs }) {
  const [expandedId, setExpandedId] = useState(null)

  const briefsByReferral = briefs.reduce((acc, b) => {
    if (b.referral_code) {
      if (!acc[b.referral_code]) acc[b.referral_code] = []
      acc[b.referral_code].push(b)
    }
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Business</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Total Referrals</th>
            <th className="px-4 py-3">Total Earned</th>
            <th className="px-4 py-3">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {referrers.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                No referrers found.
              </td>
            </tr>
          )}
          {referrers.map((r) => {
            const isExpanded = expandedId === r.id
            const referred = briefsByReferral[r.referral_code] || []
            return (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{r.name || '—'}</td>
                  <td className="px-4 py-3">{r.business_name || '—'}</td>
                  <td className="px-4 py-3">{r.email || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.referral_code || '—'}</td>
                  <td className="px-4 py-3">{r.total_referrals ?? referred.length}</td>
                  <td className="px-4 py-3">{formatCurrency(r.total_earned ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${r.is_active !== false ? 'bg-success' : 'bg-gray-300'}`}
                    />
                  </td>
                </tr>
                {isExpanded && referred.length > 0 && (
                  <tr>
                    <td colSpan={7} className="bg-gray-50 px-6 py-4">
                      <p className="text-xs text-gray-500 mb-2">Referred Briefs ({referred.length})</p>
                      <div className="space-y-1">
                        {referred.map((b) => (
                          <div key={b.id} className="flex gap-4 text-sm">
                            <span className="font-mono text-xs">{truncateId(b.id)}</span>
                            <span>{b.property_address || '—'}</span>
                            <span className="text-gray-400">{formatDate(b.created_at)}</span>
                            <Badge
                              label={b.status || 'unknown'}
                              colorClass={STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Email Captures Tab ──────────────────────────────────────────────────────

function EmailCapturesTab({ emailCaptures }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Brief ID</th>
            <th className="px-4 py-3">Converted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {emailCaptures.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                No email captures found.
              </td>
            </tr>
          )}
          {emailCaptures.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.created_at)}</td>
              <td className="px-4 py-3">{e.email || '—'}</td>
              <td className="px-4 py-3 font-mono text-xs">{truncateId(e.brief_id)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${e.converted ? 'bg-success' : 'bg-gray-300'}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { authed, checked } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [briefs, setBriefs] = useState([])
  const [purchases, setPurchases] = useState([])
  const [qsFirms, setQsFirms] = useState([])
  const [referrers, setReferrers] = useState([])
  const [emailCaptures, setEmailCaptures] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [briefsRes, purchasesRes, firmsRes, referrersRes, emailsRes] = await Promise.all([
        supabase.from('briefs').select('*').order('created_at', { ascending: false }),
        supabase.from('brief_purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('qs_firms').select('*').order('created_at', { ascending: false }),
        supabase.from('referrers').select('*').order('created_at', { ascending: false }),
        supabase.from('estimate_captures').select('*').order('created_at', { ascending: false }),
      ])

      // Check for hard errors
      const errors = [briefsRes, purchasesRes, firmsRes, referrersRes, emailsRes]
        .filter((r) => r.error)
        .map((r) => r.error.message)

      if (errors.length === 5) {
        throw new Error(errors[0])
      }

      setBriefs(briefsRes.data || [])
      setPurchases(purchasesRes.data || [])
      setQsFirms(firmsRes.data || [])
      setReferrers(referrersRes.data || [])
      setEmailCaptures(emailsRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  const handleUpdateQSStatus = async (firmId, newStatus) => {
    setActionLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('qs_firms')
        .update({ status: newStatus })
        .eq('id', firmId)

      if (updateError) throw updateError

      setQsFirms((prev) =>
        prev.map((f) => (f.id === firmId ? { ...f, status: newStatus } : f))
      )
    } catch (err) {
      alert('Failed to update status: ' + (err.message || 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  // ── Not authenticated ──

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 9v3m0 8a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-dark mb-1">Unauthorized</h2>
          <p className="text-gray-500 text-sm">Invalid admin credentials. Please reload to try again.</p>
        </div>
      </div>
    )
  }

  // ── Authenticated ──

  return (
    <div className="bg-bg-light min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">DepreciateAU marketplace management</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-0 -mb-px" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-teal text-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {error && <ErrorBanner message={error} onRetry={fetchData} />}

        {loading ? (
          <Spinner />
        ) : (
          <>
            {activeTab === 'Overview' && (
              <OverviewTab
                briefs={briefs}
                purchases={purchases}
                qsFirms={qsFirms}
                emailCaptures={emailCaptures}
              />
            )}
            {activeTab === 'Briefs' && <BriefsTab briefs={briefs} purchases={purchases} />}
            {activeTab === 'QS Firms' && (
              <QSFirmsTab
                qsFirms={qsFirms}
                onUpdateStatus={handleUpdateQSStatus}
                actionLoading={actionLoading}
              />
            )}
            {activeTab === 'Referrers' && <ReferrersTab referrers={referrers} briefs={briefs} />}
            {activeTab === 'Email Captures' && <EmailCapturesTab emailCaptures={emailCaptures} />}
          </>
        )}
      </div>
    </div>
  )
}
