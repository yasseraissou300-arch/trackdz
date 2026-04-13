import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCommandeSchema = z.object({
  reference: z.string().min(1),
  trackingNumber: z.string().optional(),
  transporteur: z.enum(['YALIDINE', 'ZREXPRESS', 'MAYSTRO', 'AMANA', 'PROCOLIS', 'ECOTRACK']),
  clientNom: z.string().min(1),
  clientTelephone: z.string().min(9),
  clientWilaya: z.string().min(1),
  clientAdresse: z.string().optional(),
  montant: z.number().optional(),
  produits: z.unknown().optional(),
  notes: z.string().optional(),
})

async function getBoutique(userId: string) {
  return prisma.boutique.findFirst({ where: { userId } })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const boutique = await getBoutique(session.user.id)
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const statut = searchParams.get('statut')
  const transporteur = searchParams.get('transporteur')
  const wilaya = searchParams.get('wilaya')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = { boutiqueId: boutique.id }

  if (statut) where.statut = statut
  if (transporteur) where.transporteur = transporteur
  if (wilaya) where.clientWilaya = { contains: wilaya, mode: 'insensitive' }
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { clientNom: { contains: search, mode: 'insensitive' } },
      { clientTelephone: { contains: search } },
      { trackingNumber: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (dateFrom || dateTo) {
    where.dateCreation = {}
    if (dateFrom) (where.dateCreation as Record<string, unknown>).gte = new Date(dateFrom)
    if (dateTo) (where.dateCreation as Record<string, unknown>).lte = new Date(dateTo)
  }

  const [commandes, total] = await Promise.all([
    prisma.commande.findMany({
      where,
      include: {
        waMessages: { orderBy: { createdAt: 'desc' }, take: 1 },
        historique: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { dateCreation: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.commande.count({ where }),
  ])

  return NextResponse.json({
    commandes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const boutique = await getBoutique(session.user.id)
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  try {
    const body = await request.json()
    const parsed = createCommandeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
    }

    const { produits, ...rest } = parsed.data
    const commande = await prisma.commande.create({
      data: {
        ...rest,
        produits: produits !== undefined ? (produits as object) : undefined,
        boutiqueId: boutique.id,
        statut: 'EN_ATTENTE',
      },
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        commandeId: commande.id,
        statut: 'EN_ATTENTE',
        description: 'Commande créée',
      },
    })

    // Update boutique counter
    await prisma.boutique.update({
      where: { id: boutique.id },
      data: { commandesCount: { increment: 1 } },
    })

    return NextResponse.json(commande, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Référence déjà existante' }, { status: 400 })
    }
    console.error('Create commande error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
