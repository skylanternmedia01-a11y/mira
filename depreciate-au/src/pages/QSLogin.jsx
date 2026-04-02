import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QSLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      navigate('/qs/dashboard')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/qs/reset-password`,
      })
      if (resetError) throw resetError
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-navy no-underline">
            DepreciateAU
          </Link>
          <p className="mt-1 text-sm text-gray-500">QS Firm Portal</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {resetMode ? (
            <>
              <h1 className="text-xl font-bold text-navy">Reset your password</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email and we'll send you a reset link.
              </p>

              {resetSent ? (
                <div className="mt-6 bg-success/5 border border-success/20 text-success text-sm rounded-md px-4 py-3">
                  Password reset email sent to <span className="font-medium">{email}</span>. Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal text-white font-semibold py-2.5 rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setResetMode(false); setError(''); setResetSent(false) }}
                className="mt-4 text-sm text-teal font-medium hover:text-teal-dark cursor-pointer bg-transparent border-none"
              >
                Back to login
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-navy">Log in to your account</h1>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                    placeholder="Your password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal text-white font-semibold py-2.5 rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => { setResetMode(true); setError('') }}
                  className="text-teal font-medium hover:text-teal-dark cursor-pointer bg-transparent border-none p-0"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Not registered?{' '}
          <Link to="/qs/register" className="text-teal font-medium hover:text-teal-dark">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  )
}
