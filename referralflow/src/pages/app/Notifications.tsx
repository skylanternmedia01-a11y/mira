import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Users,
  RefreshCw,
  FileText,
  CheckCircle,
  Bell,
  BellOff,
  Check,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Notification } from '../../types/database'

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const typeConfig: Record<
  Notification['type'],
  { icon: React.ElementType; iconClass: string; bgClass: string }
> = {
  new_referral: {
    icon: Send,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
  },
  connection_request: {
    icon: Users,
    iconClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
  },
  status_update: {
    icon: RefreshCw,
    iconClass: 'text-yellow-600',
    bgClass: 'bg-yellow-100',
  },
  agreement_proposed: {
    icon: FileText,
    iconClass: 'text-indigo-600',
    bgClass: 'bg-indigo-100',
  },
  conversion: {
    icon: CheckCircle,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-100',
  },
}

export function Notifications() {
  const { professional } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (!professional) return
    fetchNotifications()
  }, [professional])

  async function fetchNotifications() {
    if (!professional) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('professional_id', professional.id)
      .order('created_at', { ascending: false })
    setNotifications(data ?? [])
    setLoading(false)
  }

  async function handleTap(notification: Notification) {
    // Mark as read
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id)
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  async function handleMarkAllRead() {
    if (!professional) return
    setMarkingAll(true)
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: n.read_at ?? new Date().toISOString() })))
    }
    setMarkingAll(false)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Inbox</p>
              <h1 className="text-xl font-bold text-slate-text leading-tight">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold align-middle">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {markingAll ? (
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div className="rounded-xl shadow-md bg-white p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-text">All caught up</p>
            <p className="text-sm text-slate-500 max-w-xs">
              You have no notifications yet. They'll appear here when you receive referrals, connection requests, and more.
            </p>
          </div>
        )}

        {/* Notification list */}
        {notifications.length > 0 && (
          <div className="rounded-xl shadow-md bg-white overflow-hidden divide-y divide-slate-100">
            {notifications.map(notification => {
              const config = typeConfig[notification.type] ?? {
                icon: Bell,
                iconClass: 'text-slate-600',
                bgClass: 'bg-slate-100',
              }
              const Icon = config.icon

              return (
                <button
                  key={notification.id}
                  onClick={() => handleTap(notification)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 relative ${
                    !notification.read ? 'bg-blue-50/60' : 'bg-white'
                  }`}
                >
                  {/* Unread left border indicator */}
                  {!notification.read && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                  )}

                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.bgClass}`}
                  >
                    <Icon className={`w-4 h-4 ${config.iconClass}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug truncate ${
                        notification.read ? 'font-medium text-slate-text' : 'font-semibold text-slate-text'
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {notification.body}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.read && (
                    <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
