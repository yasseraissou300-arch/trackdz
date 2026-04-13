'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Plug,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/commandes', icon: Package, label: 'Commandes' },
  { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { href: '/integrations', icon: Plug, label: 'Intégrations' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/parametres', icon: Settings, label: 'Paramètres' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-sidebar h-screen transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary-foreground font-heading">T</span>
        </div>
        {!collapsed && (
          <span className="font-heading font-bold text-lg text-sidebar-foreground">TrackDZ</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Plan badge */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-medium text-primary">Plan Starter</p>
          <p className="text-xs text-muted-foreground mt-0.5">500 commandes/mois</p>
          <Link
            href="/parametres"
            className="text-xs text-primary font-medium mt-1 block hover:underline"
          >
            Passer au Pro →
          </Link>
        </div>
      )}
    </aside>
  )
}
