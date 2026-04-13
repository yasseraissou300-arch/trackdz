'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { CommandesParJourChart } from '@/components/charts/CommandesParJourChart'
import { CarrierBreakdownChart } from '@/components/charts/CarrierBreakdownChart'
import { DeliveryRateChart } from '@/components/charts/DeliveryRateChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, Truck, MessageSquare, RotateCcw, TrendingUp } from 'lucide-react'

interface DashboardStats {
  metrics: {
    commandesActives: number
    tauxLivraison: number
    messagesAujourdhui: number
    commandesRetour: number
    commandesRetourVariation: number
  }
  charts: {
    commandesParJour: { date: string; count: number }[]
    repartitionTransporteur: { transporteur: string; count: number }[]
    repartitionStatut: { statut: string; count: number }[]
    sparkline: number[]
  }
  activite: Array<{
    id: string
    statut: string
    description: string | null
    createdAt: string
    commande: { reference: string; clientNom: string; transporteur: string }
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Commandes actives"
              value={stats?.metrics.commandesActives ?? 0}
              subtitle="En cours de livraison"
              icon={<Package className="h-5 w-5" />}
              sparkline={stats?.charts.sparkline}
            />
            <MetricCard
              title="Taux de livraison"
              value={`${stats?.metrics.tauxLivraison ?? 0}%`}
              subtitle="Ce mois-ci"
              icon={<TrendingUp className="h-5 w-5" />}
              valueClassName={
                (stats?.metrics.tauxLivraison ?? 0) >= 80
                  ? 'text-green-600'
                  : 'text-orange-500'
              }
            />
            <MetricCard
              title="Messages WhatsApp"
              value={stats?.metrics.messagesAujourdhui ?? 0}
              subtitle="Envoyés aujourd'hui"
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <MetricCard
              title="En retour"
              value={stats?.metrics.commandesRetour ?? 0}
              subtitle="Retours actifs"
              icon={<RotateCcw className="h-5 w-5" />}
              trend={stats?.metrics.commandesRetourVariation}
              trendLabel="vs hier"
              valueClassName={
                (stats?.metrics.commandesRetour ?? 0) > 0 ? 'text-orange-500' : undefined
              }
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Commandes — 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <CommandesParJourChart data={stats?.charts.commandesParJour ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Répartition transporteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <CarrierBreakdownChart
                data={
                  (stats?.charts.repartitionTransporteur ?? []) as {
                    transporteur: import('@prisma/client').Transporteur
                    count: number
                  }[]
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Statuts des commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <DeliveryRateChart
                data={
                  (stats?.charts.repartitionStatut ?? []) as {
                    statut: import('@prisma/client').StatutCommande
                    count: number
                  }[]
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Activité en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityFeed
                items={
                  (stats?.activite ?? []) as Parameters<typeof ActivityFeed>[0]['items']
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
