'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { STATUT_LABELS, STATUT_COLORS, TRANSPORTEUR_LABELS } from '@/types/commande'
import { StatutCommande, Transporteur } from '@prisma/client'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  statut: StatutCommande
  description: string | null
  createdAt: string | Date
  commande: {
    reference: string
    clientNom: string
    transporteur: Transporteur
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Aucune activité récente
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                item.statut === 'LIVRE' ? 'bg-green-500' :
                item.statut === 'EN_LIVRAISON' ? 'bg-orange-400' :
                item.statut === 'ECHEC_LIVRAISON' ? 'bg-red-500' :
                'bg-primary'
              )}
            />
            {index < items.length - 1 && (
              <div className="w-px h-full bg-border mt-1" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate">{item.commande.clientNom}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  STATUT_COLORS[item.statut]
                )}
              >
                {STATUT_LABELS[item.statut]}
              </span>
              <span className="text-xs text-muted-foreground">
                #{item.commande.reference} · {TRANSPORTEUR_LABELS[item.commande.transporteur]}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
