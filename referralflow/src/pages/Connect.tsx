import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapPin, Briefcase, UserCheck, UserPlus, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { sendTelegramAlert } from '../lib/helpers'
import type { Professional } from '../types/database'

type PageState = 'loading' | 'not_found' | 'ready'
type ConnectState = 'idle' | 'connecting' | 'connected' | 'already_connected' | 'error'

export function ConnectPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, professional, loading: authLoading } = useAuth()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [targetPro, setTargetPro] = useState<Professional | null>(null)
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)

  // ── Fetch target professional ────────────────────────────────────────────

  useEffect(() => {
    if (!username) {
      setPageState('not_found')
      return
    }
    fetchProfile()
  }, [username])

  async function fetchProfile() {
    setPageState('loading')

    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('username', username!)
      .single()

    if (error || !data) {
      setPageState('not_found')
      return
    }

    setTargetPro(data)
    setPageState('ready')
  }

  // ── Check existing connection once auth + profile are loaded ─────────────

  useEffect(() => {
    if (authLoading || !professional || !targetPro) return
    checkConnection()
  }, [authLoading, professional, targetPro])

  async function checkConnection() {
    if (!professional || !targetPro) return

    const { data } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(professional_a_id.eq.${professional.id},professional_b_id.eq.${targetPro.id}),` +
        `and(professional_a_id.eq.${targetPro.id},professional_b_id.eq.${professional.id})`
      )
      .in('status', ['active', 'pending'])
      .maybeSingle()

    if (data) {
      setConnectState('already_connected')
    }
  }

  // ── Connect action ───────────────────────────────────────────────────────

  async function handleConnect() {
    if (!professional || !targetPro) return
    setConnectState('connecting')
    setConnectError(null)

    // Insert connection
    const { error: connError } = await supabase.from('connections').insert({
      professional_a_id: professional.id,
      professional_b_id: targetPro.id,
      initiated_by: professional.id,
      status: 'active',
    })

    if (connError) {
      setConnectState('error')
      setConnectError('Something went wrong. Please try again.')
      return
    }

    // Notification for the target professional
    await supabase.from('notifications').insert({
      professional_id: targetPro.id,
      type: 'connection_request',
      title: 'New referral partner',
      body: `${professional.full_name} (${professional.business_name}) connected with you on ReferralFlow.`,
      link: `/app/partners`,
      read: false,
    })

    // Telegram alert
    await sendTelegramAlert(
      `🤝 <b>New connection</b>\n` +
      `<b>${professional.full_name}</b> (${professional.profession}) connected with ` +
      `<b>${targetPro.full_name}</b> (${targetPro.profession})`
    )

    setConnectState('connected')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // Auth is still resolving — wait silently so we don't flash the wrong CTA
  if (authLoading || pageState === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (pageState === 'not_found' || !targetPro) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-slate-text">Profile not found</h1>
          <p className="text-gray-500 text-sm">
            This link may be invalid or the professional may have changed their username.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full rounded-lg bg-primary text-white font-semibold min-h-[48px] hover:opacity-90 transition-opacity mt-2"
          >
            Go to ReferralFlow
          </Link>
        </div>
      </div>
    )
  }

  const location = [targetPro.suburb, targetPro.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Branding */}
        <div className="text-center">
          <span className="text-xl font-bold text-primary tracking-tight">ReferralFlow</span>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
              {targetPro.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-text">{targetPro.full_name}</h1>
              <p className="text-sm text-gray-500 font-medium">{targetPro.business_name}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase size={15} className="text-gray-400 shrink-0" />
              <span>{targetPro.profession}</span>
            </div>
            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={15} className="text-gray-400 shrink-0" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Invite message */}
          <div className="bg-primary/5 rounded-lg px-4 py-3 text-sm text-primary font-medium text-center border border-primary/10">
            {targetPro.full_name.split(' ')[0]} wants to connect as referral partners
          </div>
        </div>

        {/* Action area */}
        <div className="space-y-3">
          {/* ── User NOT logged in ── */}
          {user === null && (
            <>
              <button
                onClick={() => navigate(`/signup?connect=${targetPro.username}`)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold min-h-[48px] hover:opacity-90 active:opacity-80 transition-opacity shadow-md"
              >
                <UserPlus size={18} />
                Sign up to connect
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  to={`/login?connect=${targetPro.username}`}
                  className="text-primary font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}

          {/* ── User logged in, same profile ── */}
          {user !== null && professional?.username === targetPro.username && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-yellow-800 font-medium">This is your own profile link.</p>
              <p className="text-xs text-yellow-600 mt-1">Share it with others to let them connect with you.</p>
            </div>
          )}

          {/* ── User logged in, already connected ── */}
          {user !== null &&
            professional?.username !== targetPro.username &&
            connectState === 'already_connected' && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 flex items-center gap-3">
                <UserCheck size={22} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    You're already connected with {targetPro.full_name.split(' ')[0]}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">View your partner in the Partners tab.</p>
                </div>
              </div>
            )}

          {/* ── User logged in, success after connecting ── */}
          {user !== null &&
            professional?.username !== targetPro.username &&
            connectState === 'connected' && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 flex items-center gap-3">
                  <UserCheck size={22} className="text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Connected with {targetPro.full_name.split(' ')[0]}!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">You can now send each other referrals.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/app/partners')}
                  className="w-full rounded-lg bg-primary text-white font-semibold min-h-[48px] hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  View your partners
                </button>
              </div>
            )}

          {/* ── User logged in, connect CTA ── */}
          {user !== null &&
            professional?.username !== targetPro.username &&
            (connectState === 'idle' || connectState === 'connecting' || connectState === 'error') && (
              <div className="space-y-3">
                <button
                  onClick={handleConnect}
                  disabled={connectState === 'connecting'}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white font-semibold min-h-[48px] hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shadow-md"
                >
                  {connectState === 'connecting' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Connect with {targetPro.full_name.split(' ')[0]}
                    </>
                  )}
                </button>

                {connectState === 'error' && connectError && (
                  <p className="text-sm text-red-600 text-center">{connectError}</p>
                )}
              </div>
            )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Powered by{' '}
          <Link to="/" className="text-primary hover:underline">
            ReferralFlow
          </Link>
        </p>
      </div>
    </div>
  )
}
