import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  className?: string
  valueClassName?: string
  sparkline?: number[]
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  className,
  valueClassName,
  sparkline,
}: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={cn('text-3xl font-bold font-heading', valueClassName)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isPositiveTrend ? 'text-green-600' : 'text-red-500'
                )}
              >
                {isPositiveTrend ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {trend > 0 ? '+' : ''}{trend} {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            {sparkline && sparkline.length > 0 && (
              <SparklineSVG data={sparkline} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SparklineSVG({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const width = 60
  const height = 24
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - (v / max) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="text-primary">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}
