import { Link } from 'react-router-dom';
import { Users, Send, BarChart3, CheckCircle2 } from 'lucide-react';

const PROFESSIONS = [
  'Accountants',
  'Mortgage Brokers',
  'Conveyancers',
  'Real Estate Agents',
  "Buyer's Agents",
  'Building Inspectors',
  'Financial Planners',
  'Insurance Brokers',
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Users,
    title: 'Connect',
    description:
      'Scan a QR code or share your link to connect with referral partners',
  },
  {
    step: 2,
    icon: Send,
    title: 'Send',
    description:
      'Tap a partner, enter client details, hit send. Client gets an SMS, partner gets a notification.',
  },
  {
    step: 3,
    icon: BarChart3,
    title: 'Track',
    description:
      "See every referral's status, conversion rate, and commission earned",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-text font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary tracking-tight">
              Referio
            </span>
          </Link>
          <Link
            to="/login"
            className="min-h-[48px] flex items-center px-5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-surface px-4 sm:px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-text leading-tight tracking-tight mb-6">
            Stop losing track of referrals.{' '}
            <span className="text-primary">Start getting paid for them.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Connect with your professional network. Send referrals in 15
            seconds. Track conversions. Log commissions. All from your phone.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center min-h-[52px] px-8 rounded-[8px] bg-accent text-white font-bold text-lg hover:bg-accent-dark active:scale-95 transition-all shadow-md"
          >
            Get Started Free
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            No credit card required
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-text text-center mb-4">
            How it works
          </h2>
          <p className="text-center text-gray-500 mb-12 text-base">
            Get up and running in minutes — no training required.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="bg-surface rounded-[12px] p-8 flex flex-col items-center text-center shadow-sm border border-gray-100"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-primary" strokeWidth={1.75} />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
                  Step {step}
                </div>
                <h3 className="text-xl font-bold text-slate-text mb-3">
                  {title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for */}
      <section className="bg-surface px-4 sm:px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-text mb-4">
            Built for:
          </h2>
          <p className="text-gray-500 mb-10 text-base">
            Trusted by professionals who rely on referrals to grow their
            business.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROFESSIONS.map((profession) => (
              <li
                key={profession}
                className="flex items-center gap-2 bg-white rounded-[12px] border border-gray-100 px-4 py-3 shadow-sm text-sm font-medium text-slate-text"
              >
                <CheckCircle2
                  className="w-4 h-4 text-accent shrink-0"
                  strokeWidth={2}
                />
                {profession}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Value prop / Pricing callout */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-sm font-semibold px-4 py-2 rounded-full mb-6">
            <CheckCircle2 className="w-4 h-4" />
            No subscription required
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-text mb-4 leading-tight">
            Free to use.
            <br />
            No monthly fees.
            <br />
            No lock-in.
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-lg mx-auto">
            Referio is free for professionals. Sign up, connect with
            partners, and start sending referrals today — no credit card, no
            contracts.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center min-h-[52px] px-8 rounded-[8px] bg-primary text-white font-bold text-lg hover:bg-primary-dark active:scale-95 transition-all shadow-md"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-gray-100 px-4 sm:px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-base font-bold text-primary">Referio</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link
              to="/privacy"
              className="min-h-[48px] flex items-center hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="min-h-[48px] flex items-center hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:hello@referio.app"
              className="min-h-[48px] flex items-center hover:text-primary transition-colors"
            >
              hello@referio.app
            </a>
          </nav>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Referio
          </p>
        </div>
      </footer>
    </div>
  );
}
