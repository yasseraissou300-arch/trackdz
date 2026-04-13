'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { STATUT_LABELS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'

interface Props {
  data: { statut: StatutCommande; count: number }[]
}

const STATUT_BAR_COLORS: Record<string, string> = {
  EN_ATTENTE: '#94a3b8',
  CONFIRME: '#3b82f6',
  EN_PREPARATION: '#8b5cf6',
  EXPEDIE: '#6366f1',
  EN_TRANSIT: '#f59e0b',
  EN_LIVRAISON: '#f97316',
  LIVRE: '#1D9E75',
  ECHEC_LIVRAISON: '#ef4444',
  RETOUR_EN_COURS: '#ec4899',
  RETOURNE: '#f43f5e',
  ANNULE: '#64748b',
}

export function DeliveryRateChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: STATUT_LABELS[d.statut],
    count: d.count,
    statut: d.statut,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={STATUT_BAR_COLORS[entry.statut] || '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
