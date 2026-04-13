import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encryptApiKey } from '@/lib/utils/tracking'

const integrationSchema = z.object({
  transporteur: z.enum(['YALIDINE', 'ZREXPRESS', 'MAYSTRO', 'AMANA', 'PROCOLIS', 'ECOTRACK']),
  apiKey: z.string().min(1),
  apiSecret: z.string().optional(),
  actif: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json([], { status: 200 })

  const integrations = await prisma.integration.findMany({
    where: { boutiqueId: boutique.id },
  })

  // Mask API keys
  return NextResponse.json(
    integrations.map((i) => ({
      ...i,
      apiKey: i.apiKey ? '••••' + i.apiKey.slice(-4) : null,
      apiSecret: i.apiSecret ? '••••' : null,
    }))
  )
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  const body = await request.json()
  const parsed = integrationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const integration = await prisma.integration.upsert({
    where: {
      boutiqueId_transporteur: {
        boutiqueId: boutique.id,
        transporteur: parsed.data.transporteur,
      },
    },
    update: {
      apiKey: encryptApiKey(parsed.data.apiKey),
      apiSecret: parsed.data.apiSecret ? encryptApiKey(parsed.data.apiSecret) : undefined,
      actif: parsed.data.actif,
    },
    create: {
      boutiqueId: boutique.id,
      transporteur: parsed.data.transporteur,
      apiKey: encryptApiKey(parsed.data.apiKey),
      apiSecret: parsed.data.apiSecret ? encryptApiKey(parsed.data.apiSecret) : undefined,
      actif: parsed.data.actif,
    },
  })

  return NextResponse.json({ id: integration.id, success: true })
}
