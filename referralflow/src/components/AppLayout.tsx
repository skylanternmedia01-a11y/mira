import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Send, Users, FileText, Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function AppLayout() {
  const location = useLocation()
  const { professional } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!professional) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professional.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [professional, location.pathname])

  const navItems = [
    { to: '/app/dashboard', icon: Home, label: 'Home' },
    { to: '/app/send', icon: Send, label: 'Send' },
    { to: '/app/partners', icon: Users, label: 'Partners' },
    { to: '/app/referrals', icon: FileText, label: 'Referrals' },
    { to: '/app/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { to: '/app/profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="min-h-screen bg-surface pb-20">
      <main className="max-w-lg mx-auto px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 min-h-[48px] min-w-[48px] justify-center text-xs transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'text-gray-400'
                }`
              }
            >
              <div className="relative">
                <Icon size={22} />
                {badge ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-notification text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
