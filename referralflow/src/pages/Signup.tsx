import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateUsername, PROFESSIONS } from '../lib/helpers'

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const

export function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [profession, setProfession] = useState('')
  const [professionOther, setProfessionOther] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [abn, setAbn] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.')
      return
    }

    setLoading(true)

    try {
      // 1. Create auth user and get user ID back
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      })

      // Also call context signUp to keep auth state in sync (no-op if session already set)
      if (!authError) {
        await signUp(email, password, { full_name: fullName, phone })
      }

      if (authError) {
        setError(authError.message ?? 'Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      const userId = authData?.user?.id
      if (!userId) {
        setError('Account created but user ID was not returned. Please try logging in.')
        setLoading(false)
        return
      }

      // 2. Insert professional profile
      const { error: profileError } = await supabase.from('professionals').insert({
        auth_user_id: userId,
        full_name: fullName,
        email,
        phone,
        profession,
        profession_other: profession === 'Other' ? professionOther : null,
        business_name: businessName,
        suburb,
        state,
        abn: abn || null,
        username: generateUsername(fullName),
      })

      if (profileError) {
        setError(profileError.message ?? 'Account created but profile could not be saved. Please contact support.')
        setLoading(false)
        return
      }

      // 3. Navigate to dashboard
      navigate('/app/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-slate-300 bg-white text-slate-text placeholder-slate-400 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors'
  const selectClass =
    'w-full border border-slate-300 bg-white text-slate-text text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none cursor-pointer'
  const labelClass = 'block text-sm font-medium text-slate-text mb-1.5'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">Referio</h1>
          <p className="mt-2 text-sm text-slate-500">Create your professional account</p>
        </div>

        {/* Card */}
        <div className="bg-white shadow-sm border border-slate-200 px-8 py-10" style={{ borderRadius: '12px' }}>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" style={{ borderRadius: '8px' }}>
                {error}
              </div>
            )}

            {/* Full name */}
            <div>
              <label htmlFor="fullName" className={labelClass}>Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>Phone number</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0400 000 000"
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Profession */}
            <div>
              <label htmlFor="profession" className={labelClass}>Profession</label>
              <div className="relative">
                <select
                  id="profession"
                  required
                  value={profession}
                  onChange={(e) => {
                    setProfession(e.target.value)
                    if (e.target.value !== 'Other') setProfessionOther('')
                  }}
                  className={selectClass}
                  style={{ borderRadius: '6px' }}
                >
                  <option value="" disabled>Select your profession</option>
                  {PROFESSIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {/* Custom chevron */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Other profession — conditional */}
            {profession === 'Other' && (
              <div>
                <label htmlFor="professionOther" className={labelClass}>
                  Please specify your profession
                </label>
                <input
                  id="professionOther"
                  type="text"
                  required
                  value={professionOther}
                  onChange={(e) => setProfessionOther(e.target.value)}
                  placeholder="e.g. Property Manager"
                  className={inputClass}
                  style={{ borderRadius: '6px' }}
                />
              </div>
            )}

            {/* Business name */}
            <div>
              <label htmlFor="businessName" className={labelClass}>Business name</label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Smith & Co."
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Suburb + State — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="suburb" className={labelClass}>Suburb</label>
                <input
                  id="suburb"
                  type="text"
                  required
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Surry Hills"
                  className={inputClass}
                  style={{ borderRadius: '6px' }}
                />
              </div>
              <div>
                <label htmlFor="state" className={labelClass}>State</label>
                <div className="relative">
                  <select
                    id="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={selectClass}
                    style={{ borderRadius: '6px' }}
                  >
                    <option value="" disabled>State</option>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* ABN (optional) */}
            <div>
              <label htmlFor="abn" className={labelClass}>
                ABN{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="abn"
                type="text"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="12 345 678 901"
                className={inputClass}
                style={{ borderRadius: '6px' }}
              />
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-slate-500 leading-snug cursor-pointer">
                I agree to the{' '}
                <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white font-semibold text-sm hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              style={{ borderRadius: '8px', minHeight: '48px' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
