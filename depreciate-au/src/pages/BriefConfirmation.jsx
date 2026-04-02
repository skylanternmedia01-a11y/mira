import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const nextSteps = [
  {
    number: '1',
    title: 'Brief distributed',
    description: 'Your property brief is sent to up to 3 registered Quantity Surveyor firms in your area.',
  },
  {
    number: '2',
    title: 'QS firms review',
    description: 'Matched QS firms review your property details and prepare a quote for a full depreciation schedule.',
  },
  {
    number: '3',
    title: 'You receive quotes',
    description: 'QS firms contact you directly by phone or email with their quote and any questions about your property.',
  },
  {
    number: '4',
    title: 'You choose',
    description: 'Pick the QS that suits you best. No obligation, no lock-in. The QS prepares your ATO-compliant schedule.',
  },
]

export default function BriefConfirmation() {
  const navigate = useNavigate()
  const [briefId, setBriefId] = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('depau_estimate')
    if (!raw) {
      navigate('/')
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setBriefId(parsed.briefId || null)
    } catch {
      navigate('/')
    }
  }, [navigate])

  return (
    <section className="bg-bg-light min-h-screen py-10 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Success banner */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center mb-8">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">
            Your property brief has been submitted!
          </h1>
          <p className="text-gray-500 text-sm">
            We are matching you with registered Quantity Surveyors in your area.
          </p>

          {briefId && (
            <div className="mt-4 inline-block bg-bg-light rounded-md px-4 py-2">
              <p className="text-xs text-gray-400 mb-0.5">Brief reference</p>
              <p className="text-sm font-mono font-semibold text-navy">{briefId}</p>
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-navy mb-6">What happens next</h2>
          <div className="space-y-6">
            {nextSteps.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="w-8 h-8 bg-teal text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-medium text-navy text-sm">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Turnaround info */}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center mb-8">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-navy">Average turnaround:</span> Most QS firms
            will contact you within 1-2 business days. Full depreciation schedules are typically
            completed in 5-10 business days once you engage a QS.
          </p>
        </div>

        {/* Contact */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:hello@depreciateau.com.au" className="text-teal hover:underline">
              hello@depreciateau.com.au
            </a>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-teal hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
