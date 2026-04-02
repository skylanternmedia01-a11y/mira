import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendTelegramAlert } from '../lib/telegram'

const STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial']
const TURNAROUND_OPTIONS = ['3-5 days', '5-10 days', '10-15 days']
const PRICE_OPTIONS = ['Under $400', '$400-$500', '$500-$600', '$600-$700', '$700+']

const VALUE_PROPS = [
  { title: 'Pre-qualified leads', description: 'Every brief comes from a verified property investor who has already received an AI depreciation estimate and wants a full schedule.' },
  { title: 'AI-enriched briefs', description: 'Each brief includes property details, AI-estimated depreciation ranges, and investor contact information — ready to quote.' },
  { title: 'Only 3 QS per brief', description: 'Each brief is released to a maximum of 3 QS firms. Less competition, higher conversion.' },
  { title: 'Pay per lead — $75', description: 'No subscriptions, no upfront fees. You only pay $75 when you choose to purchase a brief. Credits never expire.' },
]

const initialForm = {
  business_name: '',
  contact_name: '',
  email: '',
  password: '',
  phone: '',
  abn: '',
  aiqs_number: '',
  tpb_number: '',
  states_serviced: [],
  property_types_serviced: [],
  typical_turnaround: '',
  price_range: '',
  bio: '',
}

export default function QSRegister() {
  const [form, setForm] = useState(initialForm)
  const [confirmRegistration, setConfirmRegistration] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleArrayField(field, value) {
    setForm((prev) => {
      const arr = prev[field]
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  function validate() {
    if (!form.business_name.trim()) return 'Business name is required.'
    if (!form.contact_name.trim()) return 'Contact name is required.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'A valid email is required.'
    if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.'
    if (!form.phone.trim()) return 'Phone number is required.'
    if (!form.abn.trim()) return 'ABN is required.'
    if (!form.aiqs_number.trim()) return 'AIQS membership number is required.'
    if (!form.tpb_number.trim()) return 'TPB registration number is required.'
    if (form.states_serviced.length === 0) return 'Select at least one state.'
    if (form.property_types_serviced.length === 0) return 'Select at least one property type.'
    if (!form.typical_turnaround) return 'Select typical turnaround time.'
    if (!form.price_range) return 'Select a price range.'
    if (!confirmRegistration) return 'Please confirm your TPB and AIQS registration.'
    if (!agreeTerms) return 'Please agree to the platform terms.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) throw authError

      const { password, ...firmData } = form
      const { error: insertError } = await supabase.from('qs_firms').insert({
        ...firmData,
        auth_user_id: authData.user?.id,
        status: 'pending',
      })

      if (insertError) throw insertError

      await sendTelegramAlert(
        `<b>New QS Registration</b>\n` +
        `Firm: ${form.business_name}\n` +
        `Contact: ${form.contact_name}\n` +
        `Email: ${form.email}\n` +
        `States: ${form.states_serviced.join(', ')}\n` +
        `ABN: ${form.abn} | AIQS: ${form.aiqs_number} | TPB: ${form.tpb_number}`
      )

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy">Application Submitted</h2>
          <p className="mt-4 text-gray-500 leading-relaxed">
            We'll review your application and activate your account within 2 business days.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            You'll receive a confirmation email at <span className="font-medium text-slate-dark">{form.email}</span> once approved.
          </p>
          <Link
            to="/"
            className="inline-block mt-8 text-teal font-semibold hover:text-teal-dark transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Hero */}
      <section className="bg-navy text-white py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Join Australia's tax depreciation marketplace
          </h1>
          <p className="mt-4 text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
            Receive pre-qualified property briefs from investors in your region. No subscriptions — pay only when you purchase a lead.
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_PROPS.map((vp) => (
            <div key={vp.title} className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-navy text-sm">{vp.title}</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{vp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-navy">Register your firm</h2>
          <p className="mt-1 text-sm text-gray-500">All fields are required unless noted.</p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Business Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} />
              <Field label="Contact Name" name="contact_name" value={form.contact_name} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
              <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
            </div>

            {/* Registration Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="ABN" name="abn" value={form.abn} onChange={handleChange} />
              <Field label="AIQS Membership Number" name="aiqs_number" value={form.aiqs_number} onChange={handleChange} />
              <Field label="TPB Registration Number" name="tpb_number" value={form.tpb_number} onChange={handleChange} />
            </div>

            {/* States Serviced */}
            <fieldset>
              <legend className="text-sm font-medium text-slate-dark mb-2">States Serviced</legend>
              <div className="flex flex-wrap gap-3">
                {STATES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.states_serviced.includes(s)}
                      onChange={() => toggleArrayField('states_serviced', s)}
                      className="rounded accent-teal"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Property Types */}
            <fieldset>
              <legend className="text-sm font-medium text-slate-dark mb-2">Property Types Serviced</legend>
              <div className="flex flex-wrap gap-4">
                {PROPERTY_TYPES.map((pt) => (
                  <label key={pt} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.property_types_serviced.includes(pt)}
                      onChange={() => toggleArrayField('property_types_serviced', pt)}
                      className="rounded accent-teal"
                    />
                    {pt}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Typical Turnaround</label>
                <select
                  name="typical_turnaround"
                  value={form.typical_turnaround}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                >
                  <option value="">Select...</option>
                  {TURNAROUND_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Price Range (inc. GST)</label>
                <select
                  name="price_range"
                  value={form.price_range}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                >
                  <option value="">Select...</option>
                  {PRICE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1">About Your Firm</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Brief description of your firm, experience, and what sets you apart..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal resize-vertical"
              />
            </div>

            {/* Confirmations */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmRegistration}
                  onChange={(e) => setConfirmRegistration(e.target.checked)}
                  className="mt-0.5 rounded accent-teal"
                />
                <span>I confirm that my firm is currently registered with the Tax Practitioners Board (TPB) and holds AIQS membership.</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded accent-teal"
                />
                <span>I agree to the DepreciateAU platform terms and conditions.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal text-white font-semibold py-3 rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Apply to Join'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already registered?{' '}
            <Link to="/qs/login" className="text-teal font-medium hover:text-teal-dark">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-dark mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
      />
    </div>
  )
}
