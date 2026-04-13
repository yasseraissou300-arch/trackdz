'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, RefreshCw, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { toast } from 'sonner'

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/tracking/sync', { method: 'POST' })
      const data = await res.json()
      toast.success(`Synchronisation terminée: ${data.updated} commandes mises à jour`)
    } catch {
      toast.error('Erreur de synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      {title && (
        <h1 className="font-heading font-semibold text-lg">{title}</h1>
      )}
      {!title && <div />}

      <div className="flex items-center gap-2">
        {/* Sync button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          disabled={syncing}
          title="Synchroniser le tracking"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </Button>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">{session?.user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/parametres">Paramètres</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
