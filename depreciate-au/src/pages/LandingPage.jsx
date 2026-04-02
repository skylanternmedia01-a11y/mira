import { useState } from 'react'
import { Link } from 'react-router-dom'

const trustItems = [
  { icon: '✓', text: 'ATO Compliant' },
  { icon: '✓', text: 'Registered Quantity Surveyors' },
  { icon: '✓', text: 'Average $8,000+ first year claim' },
  { icon: '✓', text: '100% Tax Deductible' },
]

const steps = [
  {
    number: '1',
    title: 'Tell us about your property',
    description:
      'Answer a few quick questions about your investment property — address, age, features and condition. Takes under 3 minutes.',
  },
  {
    number: '2',
    title: 'Get your instant estimate',
    description:
      'Our engine calculates your estimated first-year and long-term depreciation deductions on the spot. Completely free.',
  },
  {
    number: '3',
    title: 'Connect with a Quantity Surveyor',
    description:
      'Ready to claim? We match you with up to 3 registered QS firms who will quote on a full ATO-compliant schedule.',
  },
]

const benefits = [
  {
    title: 'Save thousands at tax time',
    description:
      'Most investors miss out on legitimate depreciation deductions. The average first-year claim through our platform is over $8,000.',
  },
  {
    title: 'No obligation, ever',
    description:
      'Get your free estimate and only proceed if it makes sense. You choose the QS — there is no lock-in or hidden fees.',
  },
  {
    title: 'Registered professionals only',
    description:
      'Every QS on our marketplace is registered with the Tax Practitioners Board and carries professional indemnity insurance.',
  },
  {
    title: 'Fast turnaround',
    description:
      'Most depreciation schedules are completed within 5-10 business days. Some QS firms offer express options for urgent lodgements.',
  },
]

const faqItems = [
  {
    question: 'What is tax depreciation for investment properties?',
    answer:
      'Tax depreciation allows owners of income-producing properties to claim the natural wear and tear of the building structure (Division 43 — Capital Works) and the fixtures and fittings inside it (Division 40 — Plant & Equipment) as a tax deduction each year. This reduces your taxable income and can result in significant tax savings.',
  },
  {
    question: 'Who can claim depreciation deductions?',
    answer:
      'Any owner of an income-producing (rented or available for rent) property in Australia can claim depreciation. This includes residential and commercial properties. Owner-occupiers generally cannot claim depreciation unless part of the property is used for income-producing purposes.',
  },
  {
    question: 'Do I need a depreciation schedule?',
    answer:
      'Yes. The ATO requires that a depreciation schedule be prepared by a qualified Quantity Surveyor (registered with the Tax Practitioners Board) in order to claim Division 40 and Division 43 deductions. Your accountant uses this schedule when preparing your tax return.',
  },
  {
    question: 'Can I claim depreciation on an older property?',
    answer:
      'Yes, although the amount varies. Properties built after 1985 can claim both Division 43 (Capital Works) and Division 40 (Plant & Equipment) deductions. Properties built before 1985 can still claim Division 40 deductions on items like carpets, blinds, hot water systems and appliances. Renovations done after 1985 on older properties may also qualify for Division 43.',
  },
  {
    question: 'How much does a depreciation schedule cost?',
    answer:
      'Fees vary between QS firms but typically range from $385 to $770 including GST for a standard residential property. The fee itself is 100% tax deductible in the year you pay it. Most investors recoup the cost many times over in first-year deductions alone.',
  },
  {
    question: 'Does the Quantity Surveyor need to inspect my property?',
    answer:
      'It depends on the QS firm and the property. Many firms can prepare schedules using building plans, photos and satellite imagery for standard properties. Some may require a physical or virtual inspection for complex or older properties. The QS firms that quote on your brief will advise whether an inspection is needed.',
  },
  {
    question: 'How accurate is the free online estimate?',
    answer:
      'Our estimate uses industry data and ATO depreciation rates to provide an indicative figure. It is designed to give you a realistic ballpark so you can decide whether a full schedule is worthwhile. The actual deductions in a formal schedule prepared by a QS may differ based on a detailed assessment of your specific property.',
  },
]

export default function LandingPage() {
  return (
    <div>
      <HeroSection />
      <HowItWorks />
      <WhyUseUs />
      <ForQSSection />
      <FAQSection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-3xl mx-auto">
          How much tax are you overpaying on your investment property?
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Most property investors miss thousands in legitimate depreciation deductions every year.
          Find out what you could claim — free, in under 3 minutes.
        </p>
        <Link
          to="/estimate"
          className="inline-block mt-8 bg-teal text-white font-semibold text-lg px-8 py-4 rounded-lg hover:bg-teal-dark transition-colors no-underline"
        >
          Get My Free Estimate
        </Link>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {trustItems.map((item) => (
            <div key={item.text} className="flex items-center justify-center gap-2 text-sm text-gray-300">
              <span className="text-teal font-bold">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-bg-light py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">How it works</h2>
        <p className="mt-3 text-gray-500 text-center max-w-xl mx-auto">
          Three simple steps to start claiming what you are owed.
        </p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-12 h-12 bg-teal text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyUseUs() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Why use DepreciateAU?
        </h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {benefits.map((b) => (
            <div key={b.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-navy">{b.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ForQSSection() {
  return (
    <section className="bg-navy text-white py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Are you a Quantity Surveyor?</h2>
        <p className="mt-4 text-gray-300 leading-relaxed">
          Join DepreciateAU to receive qualified property briefs from investors in your region.
          No upfront fees — you only pay when you win work.
        </p>
        <Link
          to="/qs/register"
          className="inline-block mt-8 bg-teal text-white font-semibold px-8 py-3 rounded-lg hover:bg-teal-dark transition-colors no-underline"
        >
          Register Your Firm
        </Link>
      </div>
    </section>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="bg-bg-light py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy text-center">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left px-6 py-4 flex justify-between items-center gap-4 cursor-pointer"
              >
                <span className="font-medium text-navy text-sm sm:text-base">{item.question}</span>
                <span className="text-gray-400 text-xl shrink-0">
                  {openIndex === i ? '\u2212' : '+'}
                </span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
