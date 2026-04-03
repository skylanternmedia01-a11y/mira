import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  User,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Save,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate, formatCurrency } from '../../lib/helpers'
import type { Referral, Professional } from '../../types/database'

type ReferralStatus = Referral['status']

interface TimelineStep {
  status: ReferralStatus
  label: string
  timestamp: string | null
}

function getTimeline(referral: Referral): TimelineStep[] {
  const steps: TimelineStep[] = [
    { status: 'sent', label: 'Sent', timestamp: referral.created_at },
    { status: 'viewed', label: 'Viewed', timestamp: referral.viewed_at },
    { status: 'contacted', label: 'Contacted', timestamp: referral.contacted_at },
    { status: 'quoted', label: 'Quoted', timestamp: referral.quoted_at },
  ]

  if (referral.status === 'lost') {
    steps.push({ status: 'lost', label: 'Lost', timestamp: referral.lost_at })
  } else {
    steps.push({ status: 'converted', label: 'Converted', timestamp: referral.converted_at })
  }

  return steps
}

const STATUS_ORDER: ReferralStatus[] = ['sent', 'viewed', 'contacted', 'quoted', 'converted']

function statusIndex(status: ReferralStatus): number {
  if (status === 'lost') return -1
  return STATUS_ORDER.indexOf(status)
}

export function ReferralDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { professional } = useAuth()

  const [referral, setReferral] = useState<Referral | null>(null)
  const [sender, setSender] = useState<Professional | null>(null)
  const [receiver, setReceiver] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showDealValueInput, setShowDealValueInput] = useState(false)
  const [dealValue, setDealValue] = useState('')
  const [showLostReasonInput, setShowLostReasonInput] = useState(false)
  const [lostReason, setLostReason] = useState('')

  // Notes state
  const [senderNotes, setSenderNotes] = useState('')
  const [receiverNotes, setReceiverNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const senderNotesRef = useRef<HTMLTextAreaElement>(null)
  const receiverNotesRef = useRef<HTMLTextAreaElement>(null)

  const isReceiver = professional?.id === referral?.receiver_id
  const isSender = professional?.id === referral?.sender_id

  useEffect(() => {
    if (!id || !professional) return

    async function fetchReferral() {
      setLoading(true)
      setError(null)
      try {
        const { data: referralData, error: referralErr } = await supabase
          .from('referrals')
          .select('*')
          .eq('id', id!)
          .single()

        if (referralErr || !referralData) {
          setError('Referral not found.')
          return
        }

        setReferral(referralData)
        setSenderNotes(referralData.sender_notes ?? '')
        setReceiverNotes(referralData.receiver_notes ?? '')

        const [{ data: senderData }, { data: receiverData }] = await Promise.all([
          supabase.from('professionals').select('*').eq('id', referralData.sender_id).single(),
          supabase.from('professionals').select('*').eq('id', referralData.receiver_id).single(),
        ])

        setSender(senderData)
        setReceiver(receiverData)

        // Auto-mark as viewed if current user is receiver and status is still 'sent'
        if (
          professional!.id === referralData.receiver_id &&
          referralData.status === 'sent'
        ) {
          const now = new Date().toISOString()
          const { data: updated } = await supabase
            .from('referrals')
            .update({ status: 'viewed', viewed_at: now })
            .eq('id', referralData.id)
            .select()
            .single()

          if (updated) {
            setReferral(updated)
            // Notify sender
            await supabase.from('notifications').insert({
              professional_id: referralData.sender_id,
              type: 'status_update',
              title: 'Referral viewed',
              body: `${professional!.full_name} has viewed your referral for ${referralData.client_first_name} ${referralData.client_last_name}.`,
              link: `/app/referrals/${referralData.id}`,
              read: false,
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReferral()
  }, [id, professional])

  async function updateStatus(newStatus: ReferralStatus, extra?: { deal_value?: number; lost_reason?: string }) {
    if (!referral || !professional) return
    setUpdatingStatus(true)

    try {
      const now = new Date().toISOString()

      const updates: Partial<Referral> = { status: newStatus }

      if (newStatus === 'viewed') updates.viewed_at = now
      else if (newStatus === 'contacted') updates.contacted_at = now
      else if (newStatus === 'quoted') updates.quoted_at = now
      else if (newStatus === 'lost') {
        updates.lost_at = now
        updates.lost_reason = extra?.lost_reason ?? null
      } else if (newStatus === 'converted') {
        updates.converted_at = now
        updates.deal_value = extra?.deal_value ?? null

        // Calculate commission from commission_agreements
        const { data: agreement } = await supabase
          .from('commission_agreements')
          .select('*')
          .eq('status', 'active')
          .or(
            `and(referrer_id.eq.${referral.sender_id},receiver_id.eq.${referral.receiver_id}),` +
            `and(referrer_id.eq.${referral.receiver_id},receiver_id.eq.${referral.sender_id})`
          )
          .maybeSingle()

        if (agreement && extra?.deal_value) {
          let commissionAmount = 0
          if (agreement.commission_type === 'flat') {
            commissionAmount = agreement.commission_amount
          } else if (agreement.commission_type === 'percentage') {
            commissionAmount = (extra.deal_value * agreement.commission_amount) / 100
          }
          updates.commission_amount = commissionAmount
          updates.commission_agreement_id = agreement.id
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from('referrals')
        .update(updates)
        .eq('id', referral.id)
        .select()
        .single()

      if (updateErr || !updated) {
        alert('Failed to update status. Please try again.')
        return
      }

      setReferral(updated)
      setShowDealValueInput(false)
      setShowLostReasonInput(false)
      setDealValue('')
      setLostReason('')

      // Notify the other party
      const notifyId = isSender ? referral.receiver_id : referral.sender_id
      const statusLabels: Record<ReferralStatus, string> = {
        sent: 'Sent',
        viewed: 'Viewed',
        contacted: 'Contacted',
        quoted: 'Quoted',
        converted: 'Converted',
        lost: 'Lost',
      }
      await supabase.from('notifications').insert({
        professional_id: notifyId,
        type: newStatus === 'converted' ? 'conversion' : 'status_update',
        title: `Referral ${statusLabels[newStatus]}`,
        body: `${professional.full_name} marked the referral for ${referral.client_first_name} ${referral.client_last_name} as ${statusLabels[newStatus].toLowerCase()}.`,
        link: `/app/referrals/${referral.id}`,
        read: false,
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveNotes(field: 'sender_notes' | 'receiver_notes', value: string) {
    if (!referral) return
    setSavingNotes(true)
    try {
      const { data: updated } = await supabase
        .from('referrals')
        .update({ [field]: value })
        .eq('id', referral.id)
        .select()
        .single()
      if (updated) setReferral(updated)
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !referral) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 text-center space-y-4">
        <p className="text-slate-text font-semibold">{error ?? 'Something went wrong.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary text-sm font-semibold hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  const clientName = `${referral.client_first_name} ${referral.client_last_name}`
  const partner = isSender ? receiver : sender
  const timeline = getTimeline(referral)
  const currentStatusIdx = statusIndex(referral.status)

  return (
    <div className="min-h-screen bg-surface pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center flex-shrink-0 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Referral</p>
            <h1 className="text-xl font-bold text-slate-text truncate">{clientName}</h1>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={referral.status} />
          </div>
        </div>

        {/* Direction badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
          isSender
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}>
          {isSender
            ? <ArrowUpRight className="w-4 h-4" />
            : <ArrowDownLeft className="w-4 h-4" />
          }
          {isSender ? 'Sent by you' : 'Received by you'}
        </div>

        {/* Client info card */}
        <div className="rounded-xl shadow-md bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-text">{clientName}</p>
            </div>
          </div>
          <div className="space-y-2 pl-12">
            <a
              href={`tel:${referral.client_phone}`}
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <Phone className="w-4 h-4 flex-shrink-0" />
              {referral.client_phone}
            </a>
            {referral.client_email && (
              <a
                href={`mailto:${referral.client_email}`}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                {referral.client_email}
              </a>
            )}
          </div>
          {referral.consent_captured && (
            <p className="text-xs text-slate-500 pl-12">
              Client consent captured: {formatDate(referral.consent_timestamp)}
            </p>
          )}
        </div>

        {/* Context / notes from sender */}
        {referral.context && (
          <div className="rounded-xl shadow-md bg-white p-4 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Context</p>
            <p className="text-sm text-slate-text leading-relaxed">{referral.context}</p>
          </div>
        )}

        {/* Partner info */}
        {partner && (
          <div className="rounded-xl shadow-md bg-white p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isSender ? 'Referred to' : 'Referred by'}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-slate-text">{partner.full_name}</p>
                <p className="text-sm text-slate-500">{partner.business_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Converted summary */}
        {referral.status === 'converted' && (
          <div className="rounded-xl shadow-md bg-accent/5 border border-accent/20 p-4 space-y-1">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider">Conversion</p>
            {referral.deal_value != null && (
              <p className="text-sm text-slate-text">Deal value: <span className="font-semibold">{formatCurrency(referral.deal_value)}</span></p>
            )}
            {referral.commission_amount != null && (
              <p className="text-sm text-slate-text">Commission: <span className="font-semibold text-accent">{formatCurrency(referral.commission_amount)}</span></p>
            )}
          </div>
        )}

        {/* Lost reason */}
        {referral.status === 'lost' && referral.lost_reason && (
          <div className="rounded-xl shadow-md bg-red-50 border border-red-100 p-4 space-y-1">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Lost Reason</p>
            <p className="text-sm text-slate-text">{referral.lost_reason}</p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="rounded-xl shadow-md bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Timeline</p>
          <div className="space-y-0">
            {timeline.map((step, index) => {
              const isLostStep = step.status === 'lost'
              const isCompleted = step.timestamp != null
              const isCurrent = referral.status === step.status
              const isFuture =
                !isCompleted &&
                !isCurrent &&
                (isLostStep
                  ? referral.status !== 'lost'
                  : currentStatusIdx < statusIndex(step.status))

              const isLast = index === timeline.length - 1

              return (
                <div key={step.status} className="flex gap-3">
                  {/* Indicator column */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? isLostStep
                          ? 'bg-red-100'
                          : 'bg-accent/10'
                        : isCurrent
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-slate-100'
                    }`}>
                      {isCompleted ? (
                        isLostStep ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                        )
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[16px] ${
                        isCompleted ? 'bg-accent/30' : 'bg-slate-100'
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-3 pt-0.5 flex-1">
                    <p className={`text-sm font-semibold ${
                      isCompleted
                        ? isLostStep
                          ? 'text-red-600'
                          : 'text-slate-text'
                        : isCurrent
                        ? 'text-primary'
                        : 'text-slate-300'
                    }`}>
                      {step.label}
                    </p>
                    {step.timestamp ? (
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(step.timestamp)}</p>
                    ) : isFuture ? (
                      <p className="text-xs text-slate-300 mt-0.5">Pending</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Update — receiver only */}
        {isReceiver && !['converted', 'lost'].includes(referral.status) && (
          <div className="rounded-xl shadow-md bg-white p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Status</p>

            {/* Mark as Converted flow */}
            {(referral.status === 'quoted') && (
              <>
                {showDealValueInput ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm text-slate-600 font-medium">Deal value (optional)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dealValue}
                        onChange={e => setDealValue(e.target.value)}
                        placeholder="e.g. 5000"
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          updateStatus('converted', { deal_value: dealValue ? parseFloat(dealValue) : undefined })
                        }}
                        disabled={updatingStatus}
                        className="flex-1 min-h-[48px] bg-accent text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
                      >
                        {updatingStatus ? 'Saving…' : 'Confirm Converted'}
                      </button>
                      <button
                        onClick={() => { setShowDealValueInput(false); setDealValue('') }}
                        className="px-4 min-h-[48px] bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDealValueInput(true)}
                    className="w-full min-h-[48px] bg-accent text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80"
                  >
                    Mark as Converted
                  </button>
                )}
              </>
            )}

            {/* Mark as Lost flow */}
            {['contacted', 'quoted'].includes(referral.status) && (
              <>
                {showLostReasonInput ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm text-slate-600 font-medium">Reason (optional)</span>
                      <textarea
                        ref={receiverNotesRef}
                        value={lostReason}
                        onChange={e => setLostReason(e.target.value)}
                        placeholder="Why was this lead lost?"
                        rows={3}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus('lost', { lost_reason: lostReason || undefined })}
                        disabled={updatingStatus}
                        className="flex-1 min-h-[48px] bg-red-500 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
                      >
                        {updatingStatus ? 'Saving…' : 'Confirm Lost'}
                      </button>
                      <button
                        onClick={() => { setShowLostReasonInput(false); setLostReason('') }}
                        className="px-4 min-h-[48px] bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLostReasonInput(true)}
                    className="w-full min-h-[48px] bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm transition-colors hover:bg-red-100 active:bg-red-200"
                  >
                    Mark as Lost
                  </button>
                )}
              </>
            )}

            {/* Simple next-step buttons */}
            {referral.status === 'viewed' && !showLostReasonInput && (
              <button
                onClick={() => updateStatus('contacted')}
                disabled={updatingStatus}
                className="w-full min-h-[48px] bg-primary text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
              >
                {updatingStatus ? 'Saving…' : 'Mark as Contacted'}
              </button>
            )}
            {referral.status === 'contacted' && !showLostReasonInput && (
              <button
                onClick={() => updateStatus('quoted')}
                disabled={updatingStatus}
                className="w-full min-h-[48px] bg-primary text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
              >
                {updatingStatus ? 'Saving…' : 'Mark as Quoted'}
              </button>
            )}
          </div>
        )}

        {/* Notes section */}
        <div className="rounded-xl shadow-md bg-white p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</p>

          {/* Sender notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-600">
              {isSender ? 'Your notes' : `${sender?.full_name ?? 'Sender'}'s notes`}
            </label>
            {isSender ? (
              <div className="relative">
                <textarea
                  ref={senderNotesRef}
                  value={senderNotes}
                  onChange={e => setSenderNotes(e.target.value)}
                  onBlur={() => saveNotes('sender_notes', senderNotes)}
                  placeholder="Add notes visible to your partner…"
                  rows={3}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                {savingNotes && (
                  <span className="absolute bottom-2 right-2 text-xs text-slate-400 flex items-center gap-1">
                    <Save className="w-3 h-3" /> Saving…
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5 min-h-[60px]">
                {referral.sender_notes || <span className="italic text-slate-300">No notes from sender.</span>}
              </p>
            )}
          </div>

          {/* Receiver notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-600">
              {isReceiver ? 'Your notes' : `${receiver?.full_name ?? 'Receiver'}'s notes`}
            </label>
            {isReceiver ? (
              <div className="relative">
                <textarea
                  value={receiverNotes}
                  onChange={e => setReceiverNotes(e.target.value)}
                  onBlur={() => saveNotes('receiver_notes', receiverNotes)}
                  placeholder="Add your private notes…"
                  rows={3}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                {savingNotes && (
                  <span className="absolute bottom-2 right-2 text-xs text-slate-400 flex items-center gap-1">
                    <Save className="w-3 h-3" /> Saving…
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5 min-h-[60px]">
                {referral.receiver_notes || <span className="italic text-slate-300">No notes from receiver.</span>}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
