import { cn } from '@/lib/utils'
import { STATUT_COLORS, STATUT_LABELS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'

const ANIMATED_STATUTS: StatutCommande[] = ['EN_TRANSIT', 'EN_LIVRAISON', 'EN_PREPARATION']

export function CommandeStatusBadge({ statut }: { statut: StatutCommande }) {
  const isAnimated = ANIMATED_STATUTS.includes(statut)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        STATUT_COLORS[statut]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-current',
          isAnimated && 'animate-pulse'
        )}
      />
      {STATUT_LABELS[statut]}
    </span>
  )
}
