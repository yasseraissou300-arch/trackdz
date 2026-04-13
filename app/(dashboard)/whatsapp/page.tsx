'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WA_STATUT_LABELS } from '@/types/commande'
import { WaStatut } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageSquare, Settings, CheckCheck, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaMessage {
  id: string
  telephone: string
  contenu: string
  statut: WaStatut
  sentAt: string | null
  createdAt: string
  commande: {
    reference: string
    clientNom: string
  }
}

const STATUT_ICONS: Record<WaStatut, React.ReactNode> = {
  EN_ATTENTE: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  ENVOYE: <CheckCheck className="h-3.5 w-3.5 text-gray-400" />,
  DELIVRE: <CheckCheck className="h-3.5 w-3.5 text-blue-500" />,
  LU: <CheckCheck className="h-3.5 w-3.5 text-blue-600" />,
  ECHEC: <XCircle className="h-3.5 w-3.5 text-red-500" />,
}

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, envoyes: 0, echecs: 0 })

  useEffect(() => {
    // For now display messages from recent commandes
    // In production this would be a dedicated API route
    setLoading(false)
  }, [])

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Historique des messages et gestion des templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/whatsapp/templates">
              <Settings className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Messages aujourd'hui", value: stats.total, icon: MessageSquare, color: 'text-primary' },
          { label: 'Envoyés avec succès', value: stats.envoyes, icon: CheckCheck, color: 'text-green-600' },
          { label: 'Échecs', value: stats.echecs, icon: XCircle, color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <s.icon className={cn('h-4 w-4', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold font-heading">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection widget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Connexion WhatsApp Business</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <div>
                <p className="text-sm font-medium">Non configuré</p>
                <p className="text-xs text-muted-foreground">
                  Configurez votre instance UltraMsg dans les Paramètres
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/parametres">Configurer</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Historique des messages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Aucun message envoyé pour l&apos;instant</p>
              <p className="text-xs mt-1">
                Les messages apparaissent automatiquement lors des changements de statut
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Message</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{msg.commande.clientNom}</p>
                      <p className="text-xs text-muted-foreground">{msg.telephone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-64">
                        {msg.contenu}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUT_ICONS[msg.statut]}
                        <span className="text-xs">{WA_STATUT_LABELS[msg.statut]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
