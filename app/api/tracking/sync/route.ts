import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runTrackingSync } from '@/workers/trackingWorker'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  try {
    const result = await runTrackingSync(boutique.id)
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Erreur de synchronisation' }, { status: 500 })
  }
}

// Cron endpoint (called by Vercel Cron / Railway)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runTrackingSync()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
