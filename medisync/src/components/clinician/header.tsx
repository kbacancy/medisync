'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, HelpCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { CareAlert, Profile } from '@/types'

interface ClinicianHeaderProps {
  profile: Profile
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/telehealth': 'Telehealth',
  '/schedule': 'Schedule',
  '/settings': 'Settings',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function getPageTitle(pathname: string): string {
  for (const [route, title] of Object.entries(pageTitles)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title
  }
  return 'MediSync'
}

function SeverityIcon({ severity }: { severity: CareAlert['severity'] }) {
  if (severity === 'high' || severity === 'critical')
    return <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
  if (severity === 'moderate')
    return <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
  return <Info className="size-3.5 text-blue-500 shrink-0" />
}

export function ClinicianHeader({ profile }: ClinicianHeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const alerts = useNotificationStore((s) => s.alerts)
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen])

  async function handleMarkAllRead() {
    markAllRead()
    setPanelOpen(false)

    const supabase = createClient()
    await supabase
      .from('care_alerts')
      .update({ is_read: true })
      .eq('is_read', false)
  }

  const recentAlerts = alerts.slice(0, 5)

  return (
    <header
      className={cn(
        'fixed top-0 left-[240px] right-0 h-16 bg-white shadow-sm z-40',
        'flex items-center justify-between px-6'
      )}
    >
      {/* Left: Page title */}
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Bell with notification count */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen((prev) => !prev)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {recentAlerts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No notifications</p>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-2.5 px-4 py-3',
                        !alert.is_read && 'bg-gray-50'
                      )}
                    >
                      <SeverityIcon severity={alert.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentAlerts.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full text-xs text-[#0D6B5E] font-medium hover:underline text-center"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help icon */}
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <HelpCircle className="size-5 text-gray-600" />
        </button>

        {/* Emergency button */}
        <button className="bg-red-500 text-white rounded-full px-4 py-1.5 text-sm font-medium hover:bg-red-600 transition-colors">
          EMERGENCY
        </button>

        {/* Avatar initials */}
        <div className="size-9 rounded-full bg-[#0D6B5E] flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {getInitials(profile.full_name)}
          </span>
        </div>
      </div>
    </header>
  )
}
