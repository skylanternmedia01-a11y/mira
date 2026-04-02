import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_STEPS = ['purchased', 'contacted', 'quoted', 'engaged', 'completed']
const STATUS_LABELS = {
  purchased: 'Purchased',
  contacted: 'Contacted',
  quoted: 'Quoted',
  engaged: 'Engaged',
  completed: 'Completed',
}

const CREDIT_PACKAGES = [
  { credits: 5, price: 375, label: '5 briefs', savings: null },
  { credits: 10, price: 750, label: '10 briefs', savings: null },
  { credits: 20, price: 1500, label: '20 briefs', savings: null },
]

function fmt(n) {
  return '$' + (n || 0).toLocaleString()
}

function extractSuburb(address) {
  if (!address) return 'Unknown'
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 2) return parts[parts.length - 2]
  const words = address.split(' ')
  if (words.length >= 3) return words.slice(-3, -1).join(' ')
  return address
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function QSDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [firm, setFirm] = useState(null)
  const [activeTab, setActiveTab] = useState('available')
  const [briefs, setBriefs] = useState([])
  const [myPurchases, setMyPurchases] = useState([])
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [briefsLoading, setBriefsLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    available: 0,
    thisMonth: 0,
    total: 0,
    credits: 0,
  })

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        navigate('/qs/login')
        return
      }
      setUser(authUser)

      // Fetch QS firm by auth user id
      const { data: firmData, error: firmError } = await supabase
        .from('qs_firms')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      if (firmError || !firmData) {
        setError('Could not find your QS firm profile. Please contact support.')
        setLoading(false)
        return
      }

      if (firmData.status === 'pending') {
        setError('Your account is pending approval. We will notify you once activated.')
        setLoading(false)
        return
      }

      if (firmData.status === 'suspended') {
        setError('Your account has been suspended. Please contact support.')
        setLoading(false)
        return
      }

      setFirm(firmData)
      setStats((prev) => ({ ...prev, credits: firmData.credit_balance || 0 }))
      setLoading(false)
    }

    checkAuth()
  }, [navigate])

  // Fetch data when firm is loaded or tab changes
  useEffect(() => {
    if (!firm) return

    if (activeTab === 'available') {
      fetchAvailableBriefs()
    } else if (activeTab === 'my-briefs') {
      fetchMyPurchases()
    }
  }, [firm, activeTab])

  async function fetchAvailableBriefs() {
    setBriefsLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('briefs')
        .select('*')
        .in('status', ['brief_submitted', 'claimed'])
        .gt('slots_remaining', 0)
        .in('property_state', firm.states_serviced || [])
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setBriefs(data || [])
      setStats((prev) => ({ ...prev, available: (data || []).length }))
    } catch (err) {
      console.error('Fetch briefs error:', err)
      setError('Failed to load available briefs.')
    } finally {
      setBriefsLoading(false)
    }
  }

  async function fetchMyPurchases() {
    setBriefsLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('brief_purchases')
        .select('*, briefs(*)')
        .eq('qs_firm_id', firm.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setMyPurchases(data || [])

      const now = new Date()
      const thisMonth = (data || []).filter((p) => {
        const d = new Date(p.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })

      setStats((prev) => ({
        ...prev,
        thisMonth: thisMonth.length,
        total: (data || []).length,
      }))
    } catch (err) {
      console.error('Fetch purchases error:', err)
      setError('Failed to load your briefs.')
    } finally {
      setBriefsLoading(false)
    }
  }

  async function handlePurchaseBrief(briefId) {
    setPurchaseLoading(briefId)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('purchase_brief_slot', {
        p_brief_id: briefId,
        p_qs_firm_id: firm.id,
      })

      if (rpcError) throw rpcError

      // Fetch the full brief details after purchase
      const { data: fullBrief, error: briefError } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', briefId)
        .single()

      if (briefError) throw briefError

      // Refresh purchases so the detail view can find the purchase record
      const { data: purchasesData } = await supabase
        .from('brief_purchases')
        .select('*, briefs(*)')
        .eq('qs_firm_id', firm.id)
        .order('created_at', { ascending: false })

      if (purchasesData) setMyPurchases(purchasesData)

      const purchase = (purchasesData || []).find((p) => p.brief_id === briefId)
      setSelectedBrief({
        ...fullBrief,
        _purchaseId: purchase?.id,
        _purchaseStatus: purchase?.qs_status || 'purchased',
      })

      // Refresh credits
      const { data: updatedFirm } = await supabase
        .from('qs_firms')
        .select('credit_balance')
        .eq('id', firm.id)
        .single()

      if (updatedFirm) {
        setFirm((prev) => ({ ...prev, credit_balance: updatedFirm.credit_balance }))
        setStats((prev) => ({ ...prev, credits: updatedFirm.credit_balance }))
      }

      // Refresh available briefs
      fetchAvailableBriefs()
    } catch (err) {
      setError(err.message || 'Failed to purchase brief. Please try again.')
    } finally {
      setPurchaseLoading(null)
    }
  }

  async function updatePurchaseStatus(purchaseId, newStatus) {
    try {
      const { error: updateError } = await supabase
        .from('brief_purchases')
        .update({ qs_status: newStatus })
        .eq('id', purchaseId)

      if (updateError) throw updateError

      setMyPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? { ...p, qs_status: newStatus } : p))
      )

      if (selectedBrief?._purchaseId === purchaseId) {
        setSelectedBrief((prev) => ({ ...prev, _purchaseStatus: newStatus }))
      }
    } catch (err) {
      setError(err.message || 'Failed to update status.')
    }
  }

  function handleBuyCredits(credits) {
    window.alert(`Stripe checkout would open here. Credits: ${credits}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && !firm) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/qs/login" className="text-teal font-medium hover:text-teal-dark">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  // Brief detail view
  if (selectedBrief) {
    const brief = selectedBrief
    const purchase = myPurchases.find((p) => p.brief_id === brief.id) || {}
    const currentStatus = brief._purchaseStatus || purchase.qs_status || 'purchased'
    const currentPurchaseId = brief._purchaseId || purchase.id

    return (
      <div className="min-h-screen bg-bg-light">
        <div className="bg-navy text-white py-4">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <button
              onClick={() => setSelectedBrief(null)}
              className="text-sm text-gray-300 hover:text-white cursor-pointer bg-transparent border-none flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to dashboard
            </button>
            <span className="text-sm text-gray-400">Ref: {brief.id?.slice(0, 8)}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status tracker */}
          {currentPurchaseId && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_STEPS.map((step, idx) => {
                  const stepIdx = STATUS_STEPS.indexOf(currentStatus)
                  const isActive = idx <= stepIdx
                  const isCurrent = step === currentStatus
                  return (
                    <button
                      key={step}
                      onClick={() => updatePurchaseStatus(currentPurchaseId, step)}
                      className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer border transition-colors ${
                        isCurrent
                          ? 'bg-teal text-white border-teal'
                          : isActive
                          ? 'bg-teal/10 text-teal border-teal/20'
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-navy mb-4">Property Details</h2>
                <div className="space-y-3 text-sm">
                  <Detail label="Address" value={brief.property_address} />
                  <Detail label="State" value={brief.property_state} />
                  <Detail label="Property Type" value={brief.property_type} />
                  <Detail label="Year Built" value={brief.year_built} />
                  <Detail label="Bedrooms" value={brief.bedrooms} />
                  <Detail label="Bathrooms" value={brief.bathrooms} />
                  <Detail label="Floor Area" value={brief.floor_area_sqm ? `${brief.floor_area_sqm} sqm` : 'Not specified'} />
                  <Detail label="Construction Type" value={brief.construction_type} />
                  <Detail label="Quality Tier" value={brief.ai_estimate?.quality_tier} />
                  <Detail label="Renovated" value={brief.renovated} />
                  {brief.renovation_year && (
                    <Detail label="Renovation Year" value={brief.renovation_year} />
                  )}
                  {brief.renovation_cost && (
                    <Detail label="Renovation Cost" value={`$${Number(brief.renovation_cost).toLocaleString()}`} />
                  )}
                </div>
              </div>

              {/* AI Estimate */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-navy mb-4">AI Depreciation Estimate</h2>
                <div className="bg-success/5 border border-success/20 rounded-md p-4 mb-4">
                  <p className="text-sm text-gray-600">Estimated first-year depreciation</p>
                  <p className="text-2xl font-bold text-success mt-1">{fmt(brief.ai_estimate?.total_firstYear)}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <Detail label="Division 43 (Annual)" value={fmt(brief.ai_estimate?.division43_annual)} />
                  <Detail label="Division 40 (First Year)" value={fmt(brief.ai_estimate?.division40_firstYear)} />
                  <Detail label="5-Year Total" value={fmt(brief.ai_estimate?.total_5year)} />
                  <Detail label="10-Year Total" value={fmt(brief.ai_estimate?.total_10year)} />
                  <Detail label="Quality Tier" value={brief.ai_estimate?.quality_tier} />
                  <Detail label="Floor Area" value={`${brief.ai_estimate?.sqm_used} sqm (${brief.ai_estimate?.sqm_source})`} />
                </div>
              </div>
            </div>

            {/* Investor contact */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-teal/20">
                <h2 className="text-lg font-bold text-navy mb-4">Investor Contact</h2>
                <div className="space-y-3 text-sm">
                  <Detail label="Name" value={brief.investor_name} />
                  <Detail label="Email" value={brief.investor_email} />
                  <Detail label="Phone" value={brief.investor_phone} />
                </div>
                <div className="mt-6 p-4 bg-teal/5 rounded-md">
                  <p className="text-sm text-teal font-medium">
                    Contact this investor to provide your quote.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Brief Info</h3>
                <div className="space-y-2 text-sm">
                  <Detail label="Submitted" value={formatDate(brief.created_at)} />
                  <Detail label="Brief ID" value={brief.id?.slice(0, 8)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'available', label: 'Available Briefs' },
    { id: 'my-briefs', label: 'My Briefs' },
    { id: 'buy-credits', label: 'Buy Credits' },
  ]

  const filteredPurchases =
    statusFilter === 'all'
      ? myPurchases
      : myPurchases.filter((p) => p.qs_status === statusFilter)

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-navy text-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">{firm.business_name}</h1>
              <p className="text-sm text-gray-400">QS Dashboard</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                navigate('/qs/login')
              }}
              className="text-sm text-gray-400 hover:text-white cursor-pointer bg-transparent border-none self-start sm:self-auto"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Available Briefs" value={stats.available} />
          <StatCard label="Purchased This Month" value={stats.thisMonth} />
          <StatCard label="Total Purchased" value={stats.total} />
          <StatCard label="Credit Balance" value={`${stats.credits} credits`} highlight />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError('') }}
              className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer border-none transition-colors ${
                activeTab === tab.id
                  ? 'bg-navy text-white'
                  : 'bg-transparent text-gray-500 hover:text-navy hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
            {error}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'available' && (
          <>
            {briefsLoading ? (
              <LoadingSkeleton />
            ) : briefs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">No briefs available in your service area right now.</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon -- new briefs are added daily.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {briefs.map((brief) => {
                  const suburb = extractSuburb(brief.property_address)
                  const slotsRemaining = brief.slots_remaining ?? 3
                  const firstYear = brief.ai_estimate?.total_firstYear || 0
                  const estimateLow = firstYear ? Math.floor(firstYear / 1000) * 1000 : null
                  const estimateHigh = estimateLow ? estimateLow + 2000 : null

                  return (
                    <div key={brief.id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-0.5 rounded">
                            {brief.property_type}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{brief.property_state}</span>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            slotsRemaining === 1
                              ? 'bg-warning/10 text-warning'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {slotsRemaining} of 3 remaining
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-navy">{suburb}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {brief.property_state} &middot; Built {brief.year_built}
                        {brief.bedrooms ? ` &middot; ${brief.bedrooms} bed` : ''}
                        {brief.bathrooms ? ` / ${brief.bathrooms} bath` : ''}
                      </p>

                      {estimateLow && (
                        <div className="mt-3 bg-success/5 rounded-md px-3 py-2">
                          <p className="text-xs text-gray-500">AI estimate range</p>
                          <p className="text-sm font-semibold text-success">
                            {fmt(estimateLow)} - {fmt(estimateHigh)}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>{brief.ai_estimate?.quality_tier || 'Standard'} quality</span>
                        <span>{formatDate(brief.created_at)}</span>
                      </div>

                      <button
                        onClick={() => handlePurchaseBrief(brief.id)}
                        disabled={purchaseLoading === brief.id}
                        className="mt-4 w-full bg-teal text-white font-semibold py-2.5 rounded-lg hover:bg-teal-dark transition-colors cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                      >
                        {purchaseLoading === brief.id ? 'Purchasing...' : 'View Brief \u2014 $75'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'my-briefs' && (
          <>
            <div className="mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
              >
                <option value="all">All statuses</option>
                {STATUS_STEPS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {briefsLoading ? (
              <LoadingSkeleton />
            ) : filteredPurchases.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">
                  {statusFilter === 'all'
                    ? "You haven't purchased any briefs yet."
                    : `No briefs with status "${STATUS_LABELS[statusFilter]}".`}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => setActiveTab('available')}
                    className="mt-3 text-teal font-medium text-sm hover:text-teal-dark cursor-pointer bg-transparent border-none"
                  >
                    Browse available briefs
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPurchases.map((purchase) => {
                  const brief = purchase.briefs || {}
                  const suburb = extractSuburb(brief.property_address)

                  return (
                    <div
                      key={purchase.id}
                      className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer hover:border-teal/30 transition-colors"
                      onClick={() => {
                        setSelectedBrief({
                          ...brief,
                          _purchaseId: purchase.id,
                          _purchaseStatus: purchase.qs_status,
                        })
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-0.5 rounded">
                            {brief.property_type}
                          </span>
                          <span className="text-xs text-gray-400">{brief.property_state}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-navy">{suburb}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Purchased {formatDate(purchase.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-3 py-1 rounded-full ${
                            purchase.qs_status === 'completed'
                              ? 'bg-success/10 text-success'
                              : purchase.qs_status === 'engaged'
                              ? 'bg-teal/10 text-teal'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {STATUS_LABELS[purchase.qs_status] || 'Purchased'}
                        </span>
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'buy-credits' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-navy">Your Credit Balance</h2>
                <span className="text-2xl font-bold text-success">{stats.credits} credits</span>
              </div>
              <p className="text-sm text-gray-500">
                Each brief costs $75 to view. Purchase a package below or pay per brief.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {CREDIT_PACKAGES.map((pkg) => (
                <div key={pkg.credits} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-navy">{pkg.label}</h3>
                  <p className="text-2xl font-bold text-slate-dark mt-1">{fmt(pkg.price)}</p>
                  <p className="text-xs text-gray-400 mt-1">${pkg.price / pkg.credits} per brief</p>
                  <button
                    onClick={() => handleBuyCredits(pkg.credits)}
                    className="mt-4 w-full bg-teal text-white font-semibold py-2.5 rounded-lg hover:bg-teal-dark transition-colors cursor-pointer border-none text-sm"
                  >
                    Buy {pkg.label}
                  </button>
                </div>
              ))}

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-navy">Pay per brief</h3>
                <p className="text-2xl font-bold text-slate-dark mt-1">$75</p>
                <p className="text-xs text-gray-400 mt-1">Single brief purchase</p>
                <button
                  onClick={() => handleBuyCredits(1)}
                  className="mt-4 w-full bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-light transition-colors cursor-pointer border-none text-sm"
                >
                  Buy 1 brief
                </button>
              </div>
            </div>

            <div className="bg-teal/5 border border-teal/20 rounded-md px-4 py-3 text-sm text-teal">
              Credits never expire. Use them whenever a brief matches your service area.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-success' : 'text-navy'}`}>{value}</p>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-navy font-medium text-right">{value || '--'}</span>
    </div>
  )
}
