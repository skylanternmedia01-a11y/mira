import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, formatCurrency, sendTelegramAlert } from '../../lib/helpers'
import type { Professional, CommissionAgreement as CommissionAgreementType } from '../../types/database'

interface AgreementFormState {
  commission_type: 'flat' | 'percentage'
  commission_amount: string
  notes: string
}

const defaultForm = (): AgreementFormState => ({
  commission_type: 'flat',
  commission_amount: '',
  notes: '',
})

export function CommissionAgreement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { professional } = useAuth()

  const [partner, setPartner] = useState<Professional | null>(null)
  // toPartner: I refer TO partner — I am referrer, partner is receiver
  const [toPartnerAgreements, setToPartnerAgreements] = useState<CommissionAgreementType[]>([])
  // fromPartner: partner refers TO me — partner is referrer, I am receiver
  const [fromPartnerAgreements, setFromPartnerAgreements] = useState<CommissionAgreementType[]>([])

  const [toPartnerForm, setToPartnerForm] = useState<AgreementFormState>(defaultForm())
  const [fromPartnerForm, setFromPartnerForm] = useState<AgreementFormState>(defaultForm())

  const [toPartnerLoading, setToPartnerLoading] = useState(false)
  const [fromPartnerLoading, setFromPartnerLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [toPartnerError, setToPartnerError] = useState<string | null>(null)
  const [fromPartnerError, setFromPartnerError] = useState<string | null>(null)
  const [toPartnerSuccess, setToPartnerSuccess] = useState(false)
  const [fromPartnerSuccess, setFromPartnerSuccess] = useState(false)

  useEffect(() => {
    if (!professional || !id) return
    fetchData()
  }, [professional, id])

  async function fetchData() {
    setPageLoading(true)
    try {
      const { data: partnerData } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single()
      setPartner(partnerData)

      const { data: agreements } = await supabase
        .from('commission_agreements')
        .select('*')
        .or(
          `and(referrer_id.eq.${professional!.id},receiver_id.eq.${id}),and(referrer_id.eq.${id},receiver_id.eq.${professional!.id})`
        )
        .order('created_at', { ascending: false })

      const all = agreements ?? []
      setToPartnerAgreements(all.filter(a => a.referrer_id === professional!.id && a.receiver_id === id))
      setFromPartnerAgreements(all.filter(a => a.referrer_id === id && a.receiver_id === professional!.id))
    } finally {
      setPageLoading(false)
    }
  }

  async function handleProposeToPartner(e: React.FormEvent) {
    e.preventDefault()
    if (!professional || !partner) return
    setToPartnerLoading(true)
    setToPartnerError(null)
    setToPartnerSuccess(false)

    const amount = parseFloat(toPartnerForm.commission_amount)
    if (isNaN(amount) || amount <= 0) {
      setToPartnerError('Please enter a valid amount.')
      setToPartnerLoading(false)
      return
    }

    // Supersede any existing proposed agreement in this direction
    const existing = toPartnerAgreements.find(a => a.status === 'proposed' || a.status === 'active')
    if (existing) {
      await supabase
        .from('commission_agreements')
        .update({ status: 'superseded' })
        .eq('id', existing.id)
    }

    const { error } = await supabase.from('commission_agreements').insert({
      referrer_id: professional.id,
      receiver_id: partner.id,
      commission_type: toPartnerForm.commission_type,
      commission_amount: amount,
      notes: toPartnerForm.notes || null,
      proposed_by: professional.id,
      confirmed_by_referrer: true,
      confirmed_by_receiver: false,
      status: 'proposed',
    })

    if (error) {
      setToPartnerError(error.message)
      setToPartnerLoading(false)
      return
    }

    // Notify partner
    await supabase.from('notifications').insert({
      professional_id: partner.id,
      type: 'agreement_proposed',
      title: 'Commission agreement proposed',
      body: `${professional.full_name} has proposed a commission agreement for referrals they send to you.`,
      link: `/app/partners/${professional.id}/agreement`,
      read: false,
      read_at: null,
    })

    await sendTelegramAlert(
      `📄 <b>Commission Agreement Proposed</b>\n${professional.full_name} → ${partner.full_name}\nType: ${toPartnerForm.commission_type}, Amount: ${amount}`
    )

    setToPartnerSuccess(true)
    setToPartnerForm(defaultForm())
    await fetchData()
    setToPartnerLoading(false)
  }

  async function handleProposeFromPartner(e: React.FormEvent) {
    e.preventDefault()
    if (!professional || !partner) return
    setFromPartnerLoading(true)
    setFromPartnerError(null)
    setFromPartnerSuccess(false)

    const amount = parseFloat(fromPartnerForm.commission_amount)
    if (isNaN(amount) || amount <= 0) {
      setFromPartnerError('Please enter a valid amount.')
      setFromPartnerLoading(false)
      return
    }

    // Supersede any existing proposed agreement in this direction
    const existing = fromPartnerAgreements.find(a => a.status === 'proposed' || a.status === 'active')
    if (existing) {
      await supabase
        .from('commission_agreements')
        .update({ status: 'superseded' })
        .eq('id', existing.id)
    }

    const { error } = await supabase.from('commission_agreements').insert({
      referrer_id: partner.id,
      receiver_id: professional.id,
      commission_type: fromPartnerForm.commission_type,
      commission_amount: amount,
      notes: fromPartnerForm.notes || null,
      proposed_by: professional.id,
      confirmed_by_referrer: false,
      confirmed_by_receiver: true,
      status: 'proposed',
    })

    if (error) {
      setFromPartnerError(error.message)
      setFromPartnerLoading(false)
      return
    }

    // Notify partner
    await supabase.from('notifications').insert({
      professional_id: partner.id,
      type: 'agreement_proposed',
      title: 'Commission agreement proposed',
      body: `${professional.full_name} has proposed a commission agreement for referrals you send to them.`,
      link: `/app/partners/${professional.id}/agreement`,
      read: false,
      read_at: null,
    })

    await sendTelegramAlert(
      `📄 <b>Commission Agreement Proposed</b>\n${partner.full_name} → ${professional.full_name}\nType: ${fromPartnerForm.commission_type}, Amount: ${amount}`
    )

    setFromPartnerSuccess(true)
    setFromPartnerForm(defaultForm())
    await fetchData()
    setFromPartnerLoading(false)
  }

  async function handleAccept(agreement: CommissionAgreementType) {
    if (!professional) return
    const isReferrer = agreement.referrer_id === professional.id
    const update = isReferrer
      ? { confirmed_by_referrer: true, status: 'active' as const }
      : { confirmed_by_receiver: true, status: 'active' as const }
    await supabase.from('commission_agreements').update(update).eq('id', agreement.id)
    await fetchData()
  }

  async function handleDecline(agreement: CommissionAgreementType) {
    await supabase
      .from('commission_agreements')
      .update({ status: 'superseded' })
      .eq('id', agreement.id)
    await fetchData()
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-500">Partner not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-semibold text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-md text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Commission Agreements</p>
            <h1 className="text-xl font-bold text-slate-text leading-tight">{partner.full_name}</h1>
          </div>
        </div>

        {/* Section 1: When I refer clients TO partner */}
        <AgreementSection
          title={`When I refer clients TO ${partner.full_name.split(' ')[0]}`}
          description={`${partner.full_name} pays you a commission when your referrals convert.`}
          form={toPartnerForm}
          onFormChange={setToPartnerForm}
          onSubmit={handleProposeToPartner}
          loading={toPartnerLoading}
          error={toPartnerError}
          success={toPartnerSuccess}
          agreements={toPartnerAgreements}
          myId={professional!.id}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />

        {/* Section 2: When partner refers clients TO me */}
        <AgreementSection
          title={`When ${partner.full_name.split(' ')[0]} refers clients TO me`}
          description={`You pay ${partner.full_name} a commission when their referrals convert.`}
          form={fromPartnerForm}
          onFormChange={setFromPartnerForm}
          onSubmit={handleProposeFromPartner}
          loading={fromPartnerLoading}
          error={fromPartnerError}
          success={fromPartnerSuccess}
          agreements={fromPartnerAgreements}
          myId={professional!.id}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />

      </div>
    </div>
  )
}

interface AgreementSectionProps {
  title: string
  description: string
  form: AgreementFormState
  onFormChange: (f: AgreementFormState) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string | null
  success: boolean
  agreements: CommissionAgreementType[]
  myId: string
  onAccept: (a: CommissionAgreementType) => void
  onDecline: (a: CommissionAgreementType) => void
}

function AgreementSection({
  title,
  description,
  form,
  onFormChange,
  onSubmit,
  loading,
  error,
  success,
  agreements,
  myId,
  onAccept,
  onDecline,
}: AgreementSectionProps) {
  const activeAgreement = agreements.find(a => a.status === 'active')
  const proposedByOther = agreements.find(a => a.status === 'proposed' && a.proposed_by !== myId)
  const proposedByMe = agreements.find(a => a.status === 'proposed' && a.proposed_by === myId)

  return (
    <div className="rounded-xl shadow-md bg-white overflow-hidden">
      {/* Title bar */}
      <div className="bg-primary/5 px-4 py-3 border-b border-slate-100">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-text text-sm leading-snug">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Active agreement banner */}
        {activeAgreement && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Active Agreement</p>
              <p className="text-sm text-green-700 mt-0.5">
                {activeAgreement.commission_type === 'flat'
                  ? formatCurrency(activeAgreement.commission_amount)
                  : `${activeAgreement.commission_amount}%`}{' '}
                {activeAgreement.commission_type === 'flat' ? 'flat fee' : 'of deal value'}
              </p>
              {activeAgreement.notes && (
                <p className="text-xs text-green-600 mt-1 italic">"{activeAgreement.notes}"</p>
              )}
              <p className="text-xs text-green-600 mt-1">Since {formatDate(activeAgreement.created_at)}</p>
            </div>
          </div>
        )}

        {/* Awaiting other party's acceptance */}
        {proposedByMe && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm font-semibold text-yellow-800">Awaiting acceptance</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              You proposed:{' '}
              {proposedByMe.commission_type === 'flat'
                ? formatCurrency(proposedByMe.commission_amount)
                : `${proposedByMe.commission_amount}%`}
              {proposedByMe.notes ? ` — "${proposedByMe.notes}"` : ''}
            </p>
          </div>
        )}

        {/* Proposed by other party — accept / decline */}
        {proposedByOther && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">Proposal received</p>
              <p className="text-sm text-blue-700 mt-0.5">
                {proposedByOther.commission_type === 'flat'
                  ? formatCurrency(proposedByOther.commission_amount)
                  : `${proposedByOther.commission_amount}%`}{' '}
                {proposedByOther.commission_type === 'flat' ? 'flat fee' : 'of deal value'}
              </p>
              {proposedByOther.notes && (
                <p className="text-xs text-blue-600 mt-1 italic">"{proposedByOther.notes}"</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(proposedByOther)}
                className="flex-1 min-h-[40px] rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => onDecline(proposedByOther)}
                className="flex-1 min-h-[40px] rounded-lg bg-white border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Propose / update form */}
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {activeAgreement || proposedByMe ? 'Propose New Terms' : 'Propose Agreement'}
          </p>

          {/* Commission type */}
          <div className="flex gap-3">
            {(['flat', 'percentage'] as const).map(type => (
              <label
                key={type}
                className={`flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                  form.commission_type === type
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={`type-${title}`}
                  value={type}
                  checked={form.commission_type === type}
                  onChange={() => onFormChange({ ...form, commission_type: type })}
                  className="sr-only"
                />
                {type === 'flat' ? 'Flat fee' : 'Percentage'}
              </label>
            ))}
          </div>

          {/* Amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
              {form.commission_type === 'flat' ? '$' : '%'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={form.commission_type === 'flat' ? '1' : '0.1'}
              placeholder={form.commission_type === 'flat' ? '200' : '5'}
              value={form.commission_amount}
              onChange={e => onFormChange({ ...form, commission_amount: e.target.value })}
              required
              className="w-full min-h-[48px] rounded-lg border border-slate-200 pl-8 pr-3 text-slate-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              {form.commission_type === 'flat' ? 'AUD' : 'of deal value'}
            </span>
          </div>

          {/* Notes */}
          <textarea
            placeholder="Optional notes (e.g. applies to residential only)"
            value={form.notes}
            onChange={e => onFormChange({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Agreement proposed successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                Propose Agreement
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
