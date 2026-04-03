import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Copy,
  Check,
  Download,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Lock,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PROFESSIONS } from '../../lib/helpers'

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

export function Profile() {
  const { professional, refreshProfessional, signOut } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    profession: '',
    suburb: '',
    state: '',
    phone: '',
    email: '',
  })

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [copied, setCopied] = useState(false)
  const qrRef = useRef<SVGSVGElement>(null)

  const connectLink = professional
    ? `${window.location.origin}/connect/${professional.username}`
    : ''

  useEffect(() => {
    if (!professional) return
    setForm({
      full_name: professional.full_name ?? '',
      business_name: professional.business_name ?? '',
      profession: professional.profession ?? '',
      suburb: professional.suburb ?? '',
      state: professional.state ?? '',
      phone: professional.phone ?? '',
      email: professional.email ?? '',
    })
  }, [professional])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!professional) return
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    const { error } = await supabase
      .from('professionals')
      .update({
        full_name: form.full_name.trim(),
        business_name: form.business_name.trim(),
        profession: form.profession,
        suburb: form.suburb.trim() || null,
        state: form.state || null,
        phone: form.phone.trim(),
        email: form.email.trim(),
      })
      .eq('id', professional.id)

    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSuccess(true)
      await refreshProfessional()
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setProfileLoading(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      setPasswordLoading(false)
      return
    }

    // Verify current password by attempting a sign-in
    const { data: session } = await supabase.auth.getSession()
    const email = session?.session?.user?.email
    if (!email) {
      setPasswordError('Could not verify your session. Please sign in again.')
      setPasswordLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordForm.current,
    })

    if (signInError) {
      setPasswordError('Current password is incorrect.')
      setPasswordLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setPasswordForm({ current: '', next: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setPasswordLoading(false)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(connectLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select input
    }
  }

  function handleDownloadQR() {
    // Render QR into a canvas then download as PNG
    const svg = qrRef.current
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `referralflow-qr-${professional?.username ?? 'code'}.png`
      a.click()
    }
    img.src = url
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function handleDeleteAccount() {
    alert(
      'Account deletion is not yet available in this version. Please contact support to delete your account.'
    )
  }

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Settings</p>
            <h1 className="text-xl font-bold text-slate-text leading-tight">Your Profile</h1>
          </div>
        </div>

        {/* Profile form */}
        <div className="rounded-xl shadow-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-primary/5">
            <p className="font-semibold text-slate-text text-sm">Personal &amp; Business Details</p>
          </div>
          <form onSubmit={handleSaveProfile} className="p-4 space-y-4">

            <Field label="Full name">
              <input
                type="text"
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="form-input"
                placeholder="Jane Smith"
              />
            </Field>

            <Field label="Business name">
              <input
                type="text"
                required
                value={form.business_name}
                onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="form-input"
                placeholder="Smith & Co"
              />
            </Field>

            <Field label="Profession">
              <select
                required
                value={form.profession}
                onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                className="form-input"
              >
                <option value="" disabled>Select profession</option>
                {PROFESSIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Suburb">
                <input
                  type="text"
                  value={form.suburb}
                  onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))}
                  className="form-input"
                  placeholder="Richmond"
                />
              </Field>
              <Field label="State">
                <select
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="form-input"
                >
                  <option value="">—</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Phone">
              <input
                type="tel"
                required
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="form-input"
                placeholder="0412 345 678"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="form-input"
                placeholder="jane@example.com"
              />
            </Field>

            {profileError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Profile saved successfully.</p>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full min-h-[48px] rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {profileLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Connect link + QR code */}
        <div className="rounded-xl shadow-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-primary/5">
            <p className="font-semibold text-slate-text text-sm">Your Connect Link &amp; QR Code</p>
            <p className="text-xs text-slate-500 mt-0.5">Share this link or QR code so others can connect with you.</p>
          </div>
          <div className="p-4 space-y-4">

            {/* Copyable link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={connectLink}
                className="flex-1 min-h-[48px] rounded-lg border border-slate-200 px-3 text-sm text-slate-600 bg-slate-50 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="flex-shrink-0 min-h-[48px] px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white inline-block">
                <QRCodeSVG
                  ref={qrRef}
                  value={connectLink}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1E40AF"
                  level="M"
                />
              </div>
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 min-h-[48px] px-5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            </div>

          </div>
        </div>

        {/* Change password */}
        <div className="rounded-xl shadow-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-primary/5">
            <p className="font-semibold text-slate-text text-sm">Change Password</p>
          </div>
          <form onSubmit={handleChangePassword} className="p-4 space-y-3">

            <PasswordField
              label="Current password"
              value={passwordForm.current}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              onChange={v => setPasswordForm(f => ({ ...f, current: v }))}
              placeholder="••••••••"
            />

            <PasswordField
              label="New password"
              value={passwordForm.next}
              show={showNext}
              onToggle={() => setShowNext(v => !v)}
              onChange={v => setPasswordForm(f => ({ ...f, next: v }))}
              placeholder="Min. 8 characters"
            />

            {passwordError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Password changed successfully.</p>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full min-h-[48px] rounded-lg bg-slate-800 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {passwordLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign out + Delete account */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full min-h-[48px] rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full min-h-[48px] rounded-lg border border-red-200 bg-white text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500">{label}</label>
      <style>{`.form-input { width: 100%; min-height: 44px; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0 0.75rem; font-size: 0.875rem; color: #0F172A; background: white; } .form-input:focus { outline: none; ring: 2px; border-color: #1E40AF; } select.form-input { padding-right: 2rem; }`}</style>
      {children}
    </div>
  )
}

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[48px] rounded-lg border border-slate-200 px-3 pr-11 text-sm text-slate-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
