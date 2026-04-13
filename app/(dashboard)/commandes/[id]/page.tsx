'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommandeStatusBadge } from '@/components/commandes/CommandeStatusBadge'
import { CommandeTimeline } from '@/components/commandes/CommandeTimeline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUT_LABELS, TRANSPORTEUR_LABELS, WA_STATUT_LABELS } from '@/types/commande'
import { StatutCommande, Transporteur, WaStatut } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  Phone,
  MapPin,
  Package,
  Calendar,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Commande {
  id: string
  reference: string
  trackingNumber: string | null
  transporteur: Transporteur
  statut: StatutCommande
  clientNom: string
  clientTelephone: string
  clientWilaya: string
  clientAdresse: string | null
  montant: number | null
  produits: unknown
  notes: string | null
  dateCreation: string
  dateExpedition: string | null
  dateLivraison: string | null
  dateRetour: string | null
  waMessages: {
    id: string
    contenu: string
    statut: WaStatut
    sentAt: string | null
    createdAt: string
  }[]
  historique: {
    id: string
    statut: StatutCommande
    description: string | null
    wilaya: string | null
    createdAt: string
  }[]
}

const STATUTS = Object.entries(STATUT_LABELS) as [StatutCommande, string][]

export default function CommandeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [commande, setCommande] = useState<Commande | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sendingWA, setSendingWA] = useState(false)
  const [updatingStatut, setUpdatingStatut] = useState(false)

  useEffect(() => {
    fetch(`/api/commandes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCommande(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        router.push('/commandes')
      })
  }, [params.id, router])

  async function handleSendWA() {
    setSendingWA(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandeId: params.id }),
      })
      if (res.ok) {
        toast.success('Message WhatsApp envoyé')
        // Refresh
        const updated = await fetch(`/api/commandes/${params.id}`)
        setCommande(await updated.json())
      } else {
        toast.error('Erreur lors de l\'envoi')
      }
    } finally {
      setSendingWA(false)
    }
  }

  async function handleUpdateStatut(newStatut: StatutCommande) {
    setUpdatingStatut(true)
    try {
      const res = await fetch(`/api/commandes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCommande(updated)
        toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut]}`)
      }
    } finally {
      setUpdatingStatut(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!commande) return null

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/commandes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-xl font-bold">
                #{commande.reference}
              </h1>
              <CommandeStatusBadge statut={commande.statut} />
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {TRANSPORTEUR_LABELS[commande.transporteur]}
              {commande.trackingNumber && ` · ${commande.trackingNumber}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendWA}
            disabled={sendingWA}
          >
            {sendingWA ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            Envoyer WA
          </Button>

          <Select
            value={commande.statut}
            onValueChange={(v) => handleUpdateStatut(v as StatutCommande)}
            disabled={updatingStatut}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Client info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  {commande.clientNom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{commande.clientNom}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm pl-11">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{commande.clientTelephone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{commande.clientWilaya}</span>
                  {commande.clientAdresse && <span>· {commande.clientAdresse}</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commande info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Détails commande</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Transporteur</dt>
                  <dd className="font-medium mt-0.5">{TRANSPORTEUR_LABELS[commande.transporteur]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Tracking</dt>
                  <dd className="font-mono text-xs mt-0.5">{commande.trackingNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Montant</dt>
                  <dd className="font-medium mt-0.5">
                    {commande.montant ? `${commande.montant.toLocaleString('fr-DZ')} DA` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Date création</dt>
                  <dd className="mt-0.5">
                    {format(new Date(commande.dateCreation), 'dd MMM yyyy', { locale: fr })}
                  </dd>
                </div>
                {commande.dateExpedition && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Date expédition</dt>
                    <dd className="mt-0.5">
                      {format(new Date(commande.dateExpedition), 'dd MMM yyyy', { locale: fr })}
                    </dd>
                  </div>
                )}
                {commande.dateLivraison && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Date livraison</dt>
                    <dd className="mt-0.5 text-green-600 font-medium">
                      {format(new Date(commande.dateLivraison), 'dd MMM yyyy', { locale: fr })}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Historique de suivi</CardTitle>
            </CardHeader>
            <CardContent>
              {commande.historique.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun événement</p>
              ) : (
                <CommandeTimeline events={commande.historique} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — WhatsApp */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                Messages WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commande.waMessages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Aucun message envoyé
                </p>
              ) : (
                <div className="space-y-3">
                  {commande.waMessages.map((msg) => (
                    <div key={msg.id} className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-sm">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.contenu}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: fr })}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            msg.statut === 'LU' ? 'text-blue-600' :
                            msg.statut === 'DELIVRE' ? 'text-green-600' :
                            msg.statut === 'ENVOYE' ? 'text-gray-600' :
                            msg.statut === 'ECHEC' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}
                        >
                          {WA_STATUT_LABELS[msg.statut]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={handleSendWA}
                disabled={sendingWA}
              >
                {sendingWA ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Envoyer maintenant
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
