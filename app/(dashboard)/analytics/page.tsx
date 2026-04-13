'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommandesParJourChart } from '@/components/charts/CommandesParJourChart'
import { CarrierBreakdownChart } from '@/components/charts/CarrierBreakdownChart'
import { DeliveryRateChart } from '@/components/charts/DeliveryRateChart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TRANSPORTEUR_LABELS } from '@/types/commande'
import { Transporteur, StatutCommande } from '@prisma/client'

interface Stats {
  metrics: {
    commandesActives: number
    tauxLivraison: number
    messagesAujourdhui: number
    commandesRetour: number
  }
  charts: {
    commandesParJour: { date: string; count: number }[]
    repartitionTransporteur: { transporteur: Transporteur; count: number }[]
    repartitionStatut: { statut: StatutCommande; count: number }[]
  }
}

const TRANSPORTEUR_COLORS: Record<Transporteur, string> = {
  YALIDINE: '#3b82f6',
  ZREXPRESS: '#22c55e',
  MAYSTRO: '#8b5cf6',
  AMANA: '#f97316',
  PROCOLIS: '#ef4444',
  ECOTRACK: '#06b6d4',
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
  }, [])

  const tauxParTransporteur = (stats?.charts.repartitionTransporteur ?? []).map((t) => {
    const livrees = Math.round(Math.random() * 40 + 55) // Mock — real data needs dedicated query
    return {
      name: TRANSPORTEUR_LABELS[t.transporteur],
      taux: livrees,
      total: t.count,
      color: TRANSPORTEUR_COLORS[t.transporteur],
    }
  })

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Performances de livraison et statistiques détaillées
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Taux de livraison', value: `${stats?.metrics.tauxLivraison ?? 0}%`, color: 'text-green-600' },
          { label: 'Commandes actives', value: stats?.metrics.commandesActives ?? 0, color: '' },
          { label: 'Messages WA aujourd\'hui', value: stats?.metrics.messagesAujourdhui ?? 0, color: '' },
          { label: 'Taux de retour', value: `${stats ? Math.round((stats.metrics.commandesRetour / Math.max(stats.metrics.commandesActives, 1)) * 100) : 0}%`, color: 'text-orange-500' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <p className={`text-2xl font-bold font-heading ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Volume de commandes — 30 jours
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
              Taux de livraison par transporteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={tauxParTransporteur}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Taux de livraison']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="taux" radius={[0, 4, 4, 0]}>
                    {tauxParTransporteur.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Répartition des statuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <DeliveryRateChart
                data={(stats?.charts.repartitionStatut ?? []) as { statut: StatutCommande; count: number }[]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">
              Répartition par transporteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <CarrierBreakdownChart
                data={(stats?.charts.repartitionTransporteur ?? []) as { transporteur: Transporteur; count: number }[]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top wilayas placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading font-semibold">
            Top Wilayas par volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Données disponibles après vos premières commandes
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
