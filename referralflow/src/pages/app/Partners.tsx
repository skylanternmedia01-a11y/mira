import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, QrCode, ScanLine, Users, ArrowRight, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Professional, Connection } from '../../types/database'

interface PartnerEntry {
  connection: Connection
  partner: Professional
  referralsSent: number
  referralsReceived: number
}

export function Partners() {
  const { professional } = useAuth()
  const navigate = useNavigate()

  const [partners, setPartners] = useState<PartnerEntry[]>([])
  const [pendingIncoming, setPendingIncoming] = useState<PartnerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const connectUrl = professional
    ? `${window.location.origin}/connect/${professional.username}`
    : ''

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!professional) return
    fetchData()
  }, [professional])

  async function fetchData() {
    if (!professional) return
    setLoading(true)
    await Promise.all([fetchActivePartners(), fetchPendingIncoming()])
    setLoading(false)
  }

  async function fetchActivePartners() {
    if (!professional) return

    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'active')
      .or(`professional_a_id.eq.${professional.id},professional_b_id.eq.${professional.id}`)

    if (!connections) return

    const entries = await Promise.all(
      connections.map(async (conn) => {
        const partnerId =
          conn.professional_a_id === professional.id
            ? conn.professional_b_id
            : conn.professional_a_id

        const { data: partner } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', partnerId)
          .single()

        const [{ count: sent }, { count: received }] = await Promise.all([
          supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', professional.id)
            .eq('receiver_id', partnerId),
          supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', partnerId)
            .eq('receiver_id', professional.id),
        ])

        return partner
          ? {
              connection: conn,
              partner,
              referralsSent: sent ?? 0,
              referralsReceived: received ?? 0,
            }
          : null
      })
    )

    setPartners(entries.filter(Boolean) as PartnerEntry[])
  }

  async function fetchPendingIncoming() {
    if (!professional) return

    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'pending')
      .neq('initiated_by', professional.id)
      .or(`professional_a_id.eq.${professional.id},professional_b_id.eq.${professional.id}`)

    if (!connections) return

    const entries = await Promise.all(
      connections.map(async (conn) => {
        const partnerId =
          conn.professional_a_id === professional.id
            ? conn.professional_b_id
            : conn.professional_a_id

        const { data: partner } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', partnerId)
          .single()

        return partner
          ? {
              connection: conn,
              partner,
              referralsSent: 0,
              referralsReceived: 0,
            }
          : null
      })
    )

    setPendingIncoming(entries.filter(Boolean) as PartnerEntry[])
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleAccept(connection: Connection) {
    await supabase
      .from('connections')
      .update({ status: 'active' })
      .eq('id', connection.id)
    await fetchData()
  }

  async function handleDecline(connection: Connection) {
    await supabase
      .from('connections')
      .update({ status: 'declined' })
      .eq('id', connection.id)
    await fetchData()
  }

  function handleCopy() {
    navigator.clipboard.writeText(connectUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleScanQR() {
    if (scannerActive) {
      await stopScanner()
      return
    }

    setScannerActive(true)

    // Wait for the container to render
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')

      const scanner = new Html5QrcodeScanner(
        'qr-scanner-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render(
        (decodedText: string) => {
          // Validate it's a connect URL
          if (decodedText.includes('/connect/')) {
            scanner.clear().catch(() => {})
            setScannerActive(false)
            // Navigate to the scanned path on this origin
            try {
              const url = new URL(decodedText)
              navigate(url.pathname)
            } catch {
              navigate(decodedText.replace(window.location.origin, ''))
            }
          }
        },
        () => {
          // Scan error — ignore
        }
      )

      scannerRef.current = scanner
    } catch {
      setScannerActive(false)
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
      } catch {
        // Ignore
      }
      scannerRef.current = null
    }
    setScannerActive(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-text">Partners</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your referral network</p>
      </div>

      {/* Share your link card */}
      <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-text uppercase tracking-wide">
          Share your link
        </h2>

        {/* URL display + copy */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-surface rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 truncate font-mono select-all">
            {connectUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 rounded-lg bg-primary text-white text-sm font-semibold min-h-[48px] hover:opacity-90 active:opacity-80 transition-opacity shrink-0"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>

        {/* QR + Scan buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowQR((v) => !v)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-slate-text text-sm font-medium min-h-[48px] hover:bg-surface active:bg-gray-100 transition-colors"
          >
            <QrCode size={18} />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
          <button
            onClick={handleScanQR}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-slate-text text-sm font-medium min-h-[48px] hover:bg-surface active:bg-gray-100 transition-colors"
          >
            <ScanLine size={18} />
            {scannerActive ? 'Stop Scanner' : 'Scan QR Code'}
          </button>
        </div>

        {/* QR code display */}
        {showQR && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <QRCodeSVG value={connectUrl} size={200} />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Have a partner scan this to connect with you
            </p>
          </div>
        )}

        {/* QR scanner */}
        {scannerActive && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-text">Scan a partner's QR code</p>
              <button
                onClick={stopScanner}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                aria-label="Close scanner"
              >
                <X size={18} />
              </button>
            </div>
            <div
              id="qr-scanner-container"
              ref={scannerContainerRef}
              className="rounded-xl overflow-hidden border border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-text uppercase tracking-wide">
            Connection requests
          </h2>
          {pendingIncoming.map(({ connection, partner }) => (
            <div
              key={connection.id}
              className="bg-white rounded-xl shadow-md p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                  {partner.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-text truncate">{partner.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{partner.business_name}</p>
                  <p className="text-xs text-gray-400">{partner.profession}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(connection)}
                  className="flex-1 rounded-lg bg-accent text-white text-sm font-semibold min-h-[48px] hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(connection)}
                  className="flex-1 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium min-h-[48px] hover:bg-surface active:bg-gray-100 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Active partners list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-text uppercase tracking-wide">
          Your partners
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-6 w-6 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users size={26} className="text-primary" />
            </div>
            <p className="font-semibold text-slate-text">No partners yet</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Share your link or scan a partner's QR code to start building your referral network.
            </p>
          </div>
        ) : (
          partners.map(({ connection, partner, referralsSent, referralsReceived }) => (
            <button
              key={connection.id}
              onClick={() => navigate(`/app/partners/${connection.id}/agreement`)}
              className="w-full bg-white rounded-xl shadow-md p-4 text-left flex items-center gap-4 hover:shadow-lg active:scale-[0.99] transition-all"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                {partner.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-text truncate">{partner.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{partner.business_name}</p>
                <p className="text-xs text-gray-400">{partner.profession}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-primary">{referralsSent}</span> sent
                  </span>
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-accent">{referralsReceived}</span> received
                  </span>
                </div>
              </div>

              <ArrowRight size={18} className="text-gray-300 shrink-0" />
            </button>
          ))
        )}
      </section>
    </div>
  )
}
