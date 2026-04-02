import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendTelegramAlert } from '../lib/telegram'
import { sendEmail, estimateEmailHtml, briefConfirmationEmailHtml } from '../lib/resend'

function fmt(n) {
  return '$' + (n || 0).toLocaleString()
}

export default function EstimateResults() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('depau_estimate')
    if (!raw) {
      navigate('/estimate')
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setData(parsed)
      setEmailAddress(parsed.investor?.email || '')
    } catch {
      navigate('/estimate')
    }
  }, [navigate])

  if (!data) {
    return (
      <section className="bg-bg-light min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </section>
    )
  }

  const { estimate, property, briefId, investor } = data

  async function handleGetMatched() {
    setSubmitting(true)
    setError('')

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: dbError } = await supabase
        .from('briefs')
        .update({ status: 'brief_submitted', expires_at: expiresAt.toISOString() })
        .eq('id', briefId)

      if (dbError) {
        console.error('Brief update error:', dbError)
      }

      await sendTelegramAlert(
        `<b>New Brief Submitted</b>\n` +
        `Property: ${property.property_address}\n` +
        `State: ${property.property_state}\n` +
        `Type: ${property.property_type}, ${property.bedrooms} bed\n` +
        `Est. first year: ${fmt(estimate.total_firstYear)}\n` +
        `Investor: ${investor?.name || 'N/A'}\n` +
        `Ref: ${briefId}`
      )

      if (investor?.email) {
        await sendEmail({
          to: investor.email,
          subject: 'Your property brief has been submitted — DepreciateAU',
          html: briefConfirmationEmailHtml(briefId),
        })
      }

      navigate('/brief/confirmation')
    } catch (err) {
      console.error('Get matched error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEmailEstimate(e) {
    e.preventDefault()
    if (!emailAddress) return

    setEmailSending(true)
    try {
      await sendEmail({
        to: emailAddress,
        subject: 'Your depreciation estimate — DepreciateAU',
        html: estimateEmailHtml(estimate, property),
      })
      setEmailSent(true)
    } catch (err) {
      console.error('Email estimate error:', err)
      setError('Could not send email. Please try again.')
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <section className="bg-bg-light min-h-screen py-10 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy text-center mb-2">
          Your Depreciation Estimate
        </h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Here is what you could be claiming on your investment property.
        </p>

        {/* Property summary */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Property summary
          </h2>
          <p className="text-navy font-semibold">{property.property_address}</p>
          <p className="text-sm text-gray-500 mt-1">
            {property.property_type} &middot; {property.bedrooms} bed &middot; {property.bathrooms} bath &middot; {property.property_state}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Built {property.year_built} &middot; {estimate.sqm_used} sqm ({estimate.sqm_source}) &middot; {estimate.quality_tier} quality
          </p>
        </div>

        {/* Big number */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Estimated first-year depreciation</p>
          <p className="text-4xl sm:text-5xl font-bold text-success">{fmt(estimate.total_firstYear)}</p>
          <p className="text-xs text-gray-400 mt-2">{estimate.notes}</p>
        </div>

        {/* Breakdown table */}
        <div className="bg-white rounded-lg shadow-sm p-5 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Estimate breakdown
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-600">Division 43 (Capital Works) — annual</td>
                <td className="py-3 text-right font-semibold text-navy">{fmt(estimate.division43_annual)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-600">Division 40 (Plant &amp; Equipment) — first year</td>
                <td className="py-3 text-right font-semibold text-navy">{fmt(estimate.division40_firstYear)}</td>
              </tr>
              <tr className="border-b border-gray-100 bg-green-50">
                <td className="py-3 px-2 text-gray-700 font-medium">Total first year</td>
                <td className="py-3 px-2 text-right font-bold text-success">{fmt(estimate.total_firstYear)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-600">Total over 5 years</td>
                <td className="py-3 text-right font-semibold text-navy">{fmt(estimate.total_5year)}</td>
              </tr>
              <tr>
                <td className="py-3 text-gray-600">Total over 10 years</td>
                <td className="py-3 text-right font-semibold text-navy">{fmt(estimate.total_10year)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-xs text-amber-800 mb-8 leading-relaxed">
          This is an indicative AI-generated estimate based on the information you provided and industry averages.
          Your actual deductions may be higher or lower. A full ATO-compliant depreciation schedule must be
          prepared by a registered Quantity Surveyor following a detailed assessment of your property.
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Primary CTA */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-6 text-center border-2 border-success/30">
          <h3 className="text-lg font-bold text-navy mb-2">
            Ready to claim? Get matched with a Quantity Surveyor.
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            We will send your property brief to up to 3 registered QS firms in your area.
            They will contact you directly with a quote. No obligation, no cost to you.
          </p>
          <button
            onClick={handleGetMatched}
            disabled={submitting}
            className="bg-success text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-lg disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {submitting ? 'Submitting...' : 'Get Matched with a Quantity Surveyor \u2014 Free'}
          </button>
        </div>

        {/* Secondary CTA */}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Not ready yet? Email yourself this estimate.</p>
          {emailSent ? (
            <p className="text-sm text-success font-medium">Estimate sent! Check your inbox.</p>
          ) : (
            <form onSubmit={handleEmailEstimate} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
              />
              <button
                type="submit"
                disabled={emailSending}
                className="bg-navy text-white font-medium px-6 py-2 rounded-md hover:bg-navy-light transition-colors cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {emailSending ? 'Sending...' : 'Email Estimate'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/estimate" className="text-sm text-teal hover:underline">
            Start a new estimate
          </Link>
        </div>
      </div>
    </section>
  )
}
