import { cn } from '@/lib/utils'
import { STATUT_LABELS, STATUT_COLORS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TimelineEvent {
  id: string
  statut: StatutCommande
  description: string | null
  wilaya: string | null
  createdAt: string | Date
}

export function CommandeTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-3 h-3 rounded-full flex-shrink-0 mt-1',
                index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            {index < events.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[2rem]" />
            )}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    STATUT_COLORS[event.statut]
                  )}
                >
                  {STATUT_LABELS[event.statut]}
                </span>
                {event.description && (
                  <p className="text-sm text-foreground mt-1">{event.description}</p>
                )}
                {event.wilaya && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wilaya : {event.wilaya}
                  </p>
                )}
              </div>
              <time className="text-xs text-muted-foreground flex-shrink-0">
                {format(new Date(event.createdAt), 'dd MMM HH:mm', { locale: fr })}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
