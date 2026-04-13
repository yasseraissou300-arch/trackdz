import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { STATUT_LABELS, TRANSPORTEUR_LABELS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  MapPin,
  XCircle,
  RotateCcw,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ tracking: string }>
}

const STATUT_ICONS: Record<StatutCommande, React.ReactNode> = {
  EN_ATTENTE: <Clock className="h-5 w-5" />,
  CONFIRME: <CheckCircle className="h-5 w-5" />,
  EN_PREPARATION: <Package className="h-5 w-5" />,
  EXPEDIE: <Truck className="h-5 w-5" />,
  EN_TRANSIT: <MapPin className="h-5 w-5" />,
  EN_LIVRAISON: <Truck className="h-5 w-5" />,
  LIVRE: <Home className="h-5 w-5" />,
  ECHEC_LIVRAISON: <XCircle className="h-5 w-5" />,
  RETOUR_EN_COURS: <RotateCcw className="h-5 w-5" />,
  RETOURNE: <RotateCcw className="h-5 w-5" />,
  ANNULE: <XCircle className="h-5 w-5" />,
}

const STATUT_STEP_COLORS: Record<StatutCommande, string> = {
  EN_ATTENTE: 'bg-gray-100 text-gray-500',
  CONFIRME: 'bg-blue-100 text-blue-600',
  EN_PREPARATION: 'bg-purple-100 text-purple-600',
  EXPEDIE: 'bg-indigo-100 text-indigo-600',
  EN_TRANSIT: 'bg-yellow-100 text-yellow-600',
  EN_LIVRAISON: 'bg-orange-100 text-orange-600',
  LIVRE: 'bg-green-100 text-green-600',
  ECHEC_LIVRAISON: 'bg-red-100 text-red-600',
  RETOUR_EN_COURS: 'bg-pink-100 text-pink-600',
  RETOURNE: 'bg-rose-100 text-rose-600',
  ANNULE: 'bg-gray-100 text-gray-500',
}

const DELIVERY_STEPS: StatutCommande[] = [
  'CONFIRME',
  'EN_PREPARATION',
  'EXPEDIE',
  'EN_TRANSIT',
  'EN_LIVRAISON',
  'LIVRE',
]

function getStepProgress(statut: StatutCommande): number {
  const idx = DELIVERY_STEPS.indexOf(statut)
  if (idx < 0) return 0
  return ((idx + 1) / DELIVERY_STEPS.length) * 100
}

export default async function SuiviPage({ params }: PageProps) {
  const { tracking } = await params

  // Search by tracking number or reference
  const commande = await prisma.commande.findFirst({
    where: {
      OR: [
        { trackingNumber: tracking },
        { reference: tracking },
      ],
    },
    include: {
      boutique: { select: { nom: true, logo: true } },
      historique: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!commande) notFound()

  const progress = getStepProgress(commande.statut)
  const isDelivered = commande.statut === 'LIVRE'
  const isFailed = ['ECHEC_LIVRAISON', 'ANNULE', 'RETOURNE'].includes(commande.statut)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground font-heading">T</span>
          </div>
          <div>
            <span className="font-heading font-semibold text-sm">{commande.boutique.nom}</span>
            <p className="text-xs text-muted-foreground">Suivi de commande</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status card */}
        <div
          className={cn(
            'rounded-2xl p-6 text-center',
            isDelivered ? 'bg-green-50 border-2 border-green-200' :
            isFailed ? 'bg-red-50 border-2 border-red-200' :
            'bg-white border'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              STATUT_STEP_COLORS[commande.statut]
            )}
          >
            {STATUT_ICONS[commande.statut]}
          </div>
          <h1 className="font-heading text-2xl font-bold">
            {STATUT_LABELS[commande.statut]}
          </h1>
          <p className="text-muted-foreground mt-2">
            Commande #{commande.reference}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{TRANSPORTEUR_LABELS[commande.transporteur]}</span>
            {commande.trackingNumber && (
              <>
                <span>·</span>
                <span className="font-mono text-xs">{commande.trackingNumber}</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {!isFailed && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                {DELIVERY_STEPS.map((step) => (
                  <span
                    key={step}
                    className={cn(
                      'text-center leading-tight',
                      DELIVERY_STEPS.indexOf(commande.statut) >= DELIVERY_STEPS.indexOf(step)
                        ? 'text-primary font-medium'
                        : ''
                    )}
                  >
                    {STATUT_LABELS[step]}
                  </span>
                ))}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isDelivered ? 'bg-green-500' : 'bg-primary'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Client info */}
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold text-sm mb-3">Informations de livraison</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Destinataire</dt>
              <dd className="font-medium mt-0.5">{commande.clientNom}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Wilaya</dt>
              <dd className="font-medium mt-0.5">{commande.clientWilaya}</dd>
            </div>
            {commande.dateCreation && (
              <div>
                <dt className="text-muted-foreground text-xs">Date commande</dt>
                <dd className="mt-0.5">
                  {format(new Date(commande.dateCreation), 'dd MMM yyyy', { locale: fr })}
                </dd>
              </div>
            )}
            {commande.dateLivraison && (
              <div>
                <dt className="text-muted-foreground text-xs">Livré le</dt>
                <dd className="font-medium text-green-600 mt-0.5">
                  {format(new Date(commande.dateLivraison), 'dd MMM yyyy', { locale: fr })}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Timeline */}
        {commande.historique.length > 0 && (
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-sm mb-4">Historique de suivi</h2>
            <div className="space-y-0">
              {[...commande.historique].reverse().map((event, index, arr) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full flex-shrink-0 mt-1',
                        index === 0 ? 'bg-primary' : 'bg-gray-200'
                      )}
                    />
                    {index < arr.length - 1 && (
                      <div className="w-px flex-1 bg-gray-100 min-h-[2rem]" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            STATUT_STEP_COLORS[event.statut]
                          )}
                        >
                          {STATUT_LABELS[event.statut]}
                        </span>
                        {event.description && (
                          <p className="text-sm text-gray-700 mt-1">{event.description}</p>
                        )}
                        {event.wilaya && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.wilaya}
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
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Suivi propulsé par{' '}
          <span className="font-semibold text-primary">TrackDZ</span>
        </p>
      </main>
    </div>
  )
}
