import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const isQS = location.pathname.startsWith('/qs')
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col">
      <Header isQS={isQS} isAdmin={isAdmin} />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}

function Header({ isQS, isAdmin }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-navy font-bold text-xl no-underline">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#1B2A4A" />
              <path d="M7 20V8h4c3.3 0 5 1.7 5 4s-1.7 4-5 4H9.5v4H7z" fill="#2A9D8F" />
              <circle cx="19" cy="17" r="4" fill="#2A9D8F" opacity="0.6" />
            </svg>
            DepreciateAU
          </Link>
          <nav className="flex items-center gap-4">
            {isAdmin ? (
              <span className="text-sm text-gray-500">Admin</span>
            ) : isQS ? (
              <>
                <Link to="/qs/dashboard" className="text-sm text-gray-600 hover:text-navy no-underline">Dashboard</Link>
                <Link to="/qs/login" className="text-sm text-gray-600 hover:text-navy no-underline">Login</Link>
              </>
            ) : (
              <>
                <Link to="/estimate" className="text-sm text-gray-600 hover:text-navy no-underline hidden sm:inline">
                  Get Estimate
                </Link>
                <Link to="/qs/register" className="text-sm text-gray-600 hover:text-navy no-underline hidden sm:inline">
                  For QS Firms
                </Link>
                <Link
                  to="/estimate"
                  className="bg-teal text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-dark no-underline transition-colors"
                >
                  Free Estimate
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-3">DepreciateAU</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Australia's marketplace connecting property investors with registered Quantity Surveyors for tax depreciation schedules.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For Investors</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/estimate" className="hover:text-white no-underline text-gray-300">Get Free Estimate</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-white no-underline text-gray-300">How It Works</Link></li>
              <li><Link to="/#faq" className="hover:text-white no-underline text-gray-300">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For QS Firms</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/qs/register" className="hover:text-white no-underline text-gray-300">Join the Marketplace</Link></li>
              <li><Link to="/qs/login" className="hover:text-white no-underline text-gray-300">QS Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-600 mt-8 pt-8 text-xs text-gray-400 leading-relaxed">
          <p>
            DepreciateAU is a marketplace that connects property investors with registered Quantity Surveyors.
            We do not prepare depreciation schedules. All schedules are prepared by independent QS firms registered
            with the Tax Practitioners Board.
          </p>
          <p className="mt-2">&copy; {new Date().getFullYear()} DepreciateAU. All rights reserved. | hello@depreciateau.com.au</p>
        </div>
      </div>
    </footer>
  )
}
