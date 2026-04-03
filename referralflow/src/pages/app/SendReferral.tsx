import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, ArrowRight, Check, Send } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { sendTelegramAlert } from '../../lib/helpers'
import type { Professional, Connection } from '../../types/database'

const MAX_CONTEXT_CHARS = 280

interface PartnerOption {
  connection: Connection
  partner: Professional
}

export function SendReferral() {
  const { professional } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)

  // Step 1
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null)

  // Step 2
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [context, setContext] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})

  // Step 3
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    if (!professional) return
    async function loadPartners() {
      setPartnersLoading(true)
      const { data: connections, error } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'active')
        .or(`professional_a_id.eq.${professional!.id},professional_b_id.eq.${professional!.id}`)

      if (error || !connections) {
        setPartnersLoading(false)
        return
      }

      const partnerIds = connections.map((c: Connection) =>
        c.professional_a_id === professional!.id ? c.professional_b_id : c.professional_a_id
      )

      if (partnerIds.length === 0) {
        setPartners([])
        setPartnersLoading(false)
        return
      }

      const { data: pros } = await supabase
        .from('professionals')
        .select('*')
        .in('id', partnerIds)

      if (!pros) {
        setPartnersLoading(false)
        return
      }

      const options: PartnerOption[] = connections.map((c: Connection) => {
        const partnerId =
          c.professional_a_id === professional!.id ? c.professional_b_id : c.professional_a_id
        const partner = pros.find((p: Professional) => p.id === partnerId)!
        return { connection: c, partner }
      })

      setPartners(options)
      setPartnersLoading(false)
    }
    loadPartners()
  }, [professional])

  const filteredPartners = partners.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.partner.full_name.toLowerCase().includes(q) ||
      p.partner.business_name.toLowerCase().includes(q) ||
      p.partner.profession.toLowerCase().includes(q)
    )
  })

  function handleSelectPartner(option: PartnerOption) {
    setSelectedPartner(option)
    setStep(2)
  }

  function validateStep2() {
    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = 'Required'
    if (!lastName.trim()) errors.lastName = 'Required'
    if (!phone.trim()) errors.phone = 'Required'
    if (!context.trim()) errors.context = 'Required'
    return errors
  }

  function handleStep2Next() {
    const errors = validateStep2()
    if (Object.keys(errors).length > 0) {
      setStep2Errors(errors)
      return
    }
    if (!consent) {
      setConsentError(true)
      return
    }
    setStep2Errors({})
    setConsentError(false)
    setStep(3)
  }

  async function handleSend() {
    if (!professional || !selectedPartner) return
    setSending(true)
    setSendError(null)

    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        sender_id: professional.id,
        receiver_id: selectedPartner.partner.id,
        client_first_name: firstName.trim(),
        client_last_name: lastName.trim(),
        client_phone: phone.trim(),
        client_email: email.trim() || null,
        context: context.trim(),
        consent_captured: true,
        consent_timestamp: new Date().toISOString(),
        status: 'sent',
      })
      .select()
      .single()

    if (referralError || !referral) {
      setSendError('Failed to send referral. Please try again.')
      setSending(false)
      return
    }

    const clientName = `${firstName.trim()} ${lastName.trim()}`
    const contextPreview = context.trim().slice(0, 50)

    await supabase.from('notifications').insert({
      professional_id: selectedPartner.partner.id,
      type: 'new_referral',
      title: `New referral from ${professional.full_name}`,
      body: `${clientName} — ${contextPreview}`,
      link: `/app/referrals/${referral.id}`,
      read: false,
    })

    await sendTelegramAlert(
      `New referral: ${professional.full_name} → ${selectedPartner.partner.full_name} for ${clientName}`
    )

    navigate(`/app/referrals/${referral.id}`)
  }

  const charsRemaining = MAX_CONTEXT_CHARS - context.length

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Header */}
      <div className="bg-[#1E40AF] text-white px-4 pt-safe-top pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold mt-2">Send Referral</h1>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    s < step
                      ? 'bg-[#059669] text-white'
                      : s === step
                      ? 'bg-white text-[#1E40AF]'
                      : 'bg-blue-700 text-blue-300'
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 w-8 rounded ${
                      s < step ? 'bg-[#059669]' : 'bg-blue-700'
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-blue-200 text-sm">Step {step} of 3</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* ── STEP 1: Select Partner ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Select a partner</h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, business or profession…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] min-h-[48px]"
              />
            </div>

            {partnersLoading ? (
              <div className="text-center text-gray-400 py-12">Loading partners…</div>
            ) : filteredPartners.length === 0 && partners.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-gray-600 font-medium">No active partners yet</p>
                <p className="text-gray-400 text-sm">Connect with a partner first</p>
                <button
                  onClick={() => navigate('/app/partners')}
                  className="mt-2 px-5 py-2.5 bg-[#1E40AF] text-white rounded-lg text-sm font-medium min-h-[48px]"
                >
                  Go to Partners
                </button>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No partners match your search.</div>
            ) : (
              <div className="space-y-3">
                {filteredPartners.map((option) => (
                  <button
                    key={option.connection.id}
                    onClick={() => handleSelectPartner(option)}
                    className="w-full text-left bg-white rounded-xl shadow-md p-4 flex items-center justify-between gap-3 hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[72px] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{option.partner.full_name}</p>
                      <p className="text-sm text-gray-500">{option.partner.business_name}</p>
                      <p className="text-xs text-[#1E40AF] font-medium mt-0.5">
                        {option.partner.profession}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Client Details ── */}
        {step === 2 && selectedPartner && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Client details</h2>
            <p className="text-sm text-gray-500">
              Referring to{' '}
              <span className="font-medium text-gray-700">{selectedPartner.partner.full_name}</span>
            </p>

            <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
              {/* First name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (step2Errors.firstName) setStep2Errors((p) => ({ ...p, firstName: '' }))
                  }}
                  className={`w-full px-4 py-3 rounded-lg border bg-[#F9FAFB] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] min-h-[48px] ${
                    step2Errors.firstName ? 'border-red-400' : 'border-gray-200'
                  }`}
                  placeholder="Jane"
                />
                {step2Errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{step2Errors.firstName}</p>
                )}
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (step2Errors.lastName) setStep2Errors((p) => ({ ...p, lastName: '' }))
                  }}
                  className={`w-full px-4 py-3 rounded-lg border bg-[#F9FAFB] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] min-h-[48px] ${
                    step2Errors.lastName ? 'border-red-400' : 'border-gray-200'
                  }`}
                  placeholder="Smith"
                />
                {step2Errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{step2Errors.lastName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (step2Errors.phone) setStep2Errors((p) => ({ ...p, phone: '' }))
                  }}
                  className={`w-full px-4 py-3 rounded-lg border bg-[#F9FAFB] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] min-h-[48px] ${
                    step2Errors.phone ? 'border-red-400' : 'border-gray-200'
                  }`}
                  placeholder="04xx xxx xxx"
                />
                {step2Errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{step2Errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#F9FAFB] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] min-h-[48px]"
                  placeholder="jane@example.com"
                />
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CONTEXT_CHARS) {
                      setContext(e.target.value)
                      if (step2Errors.context) setStep2Errors((p) => ({ ...p, context: '' }))
                    }
                  }}
                  rows={3}
                  placeholder="e.g. Buying $650k IP in Robina, needs conveyancing"
                  className={`w-full px-4 py-3 rounded-lg border bg-[#F9FAFB] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] resize-none ${
                    step2Errors.context ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {step2Errors.context ? (
                    <p className="text-red-500 text-xs">{step2Errors.context}</p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs ${
                      charsRemaining <= 20 ? 'text-red-500 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {charsRemaining} remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Consent checkbox */}
            <div
              className={`bg-white rounded-xl shadow-md p-4 border-2 transition-colors ${
                consentError ? 'border-red-400' : 'border-transparent'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => {
                    setConsent((v) => !v)
                    setConsentError(false)
                  }}
                  className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 border-2 transition-colors cursor-pointer ${
                    consent
                      ? 'bg-[#059669] border-[#059669]'
                      : consentError
                      ? 'border-red-400 bg-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {consent && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-sm text-gray-700 leading-snug">
                  I confirm this client has agreed to their details being shared with{' '}
                  <span className="font-semibold">{selectedPartner.partner.full_name}</span> for the
                  purpose of{' '}
                  <span className="font-semibold">{selectedPartner.partner.profession}</span>{' '}
                  services.
                </span>
              </label>
              {consentError && (
                <p className="text-red-500 text-xs mt-2 ml-9">
                  You must confirm client consent to proceed.
                </p>
              )}
            </div>

            {/* Nav buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium min-h-[48px] hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep2Next}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#1E40AF] text-white font-semibold min-h-[48px] hover:bg-blue-800 transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm & Send ── */}
        {step === 3 && selectedPartner && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Confirm & send</h2>

            {/* Summary card */}
            <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Partner</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {selectedPartner.partner.full_name}
                </p>
                <p className="text-sm text-gray-500">{selectedPartner.partner.business_name}</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Client</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {firstName} {lastName}
                </p>
                {phone && <p className="text-sm text-gray-500">{phone}</p>}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Context</p>
                <p className="text-sm text-gray-700 mt-0.5">{context}</p>
              </div>
            </div>

            {/* What will happen */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-[#1E40AF]">The following will happen:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">
                      {firstName} {lastName}
                    </span>{' '}
                    will receive an SMS introducing{' '}
                    <span className="font-medium">{selectedPartner.partner.full_name}</span>
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">{selectedPartner.partner.full_name}</span> will be
                    notified with the client's details
                  </span>
                </li>
              </ul>
            </div>

            {sendError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {sendError}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-[#059669] text-white font-bold text-base min-h-[56px] hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {sending ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                    />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Send Referral
                </>
              )}
            </button>

            {/* Back button */}
            <button
              onClick={() => setStep(2)}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium min-h-[48px] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
