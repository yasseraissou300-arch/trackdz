'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TRANSPORTEUR_LABELS } from '@/types/commande'
import { Transporteur } from '@prisma/client'

const COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']

interface Props {
  data: { transporteur: Transporteur; count: number }[]
}

export function CarrierBreakdownChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: TRANSPORTEUR_LABELS[d.transporteur],
    value: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
