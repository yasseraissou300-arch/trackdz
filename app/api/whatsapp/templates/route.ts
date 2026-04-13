import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const templateSchema = z.object({
  nom: z.string().min(1),
  declencheur: z.enum(['EN_ATTENTE','CONFIRME','EN_PREPARATION','EXPEDIE','EN_TRANSIT','EN_LIVRAISON','LIVRE','ECHEC_LIVRAISON','RETOUR_EN_COURS','RETOURNE','ANNULE']),
  contenu: z.string().min(1),
  actif: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const templates = await prisma.waTemplate.findMany({
    where: { boutiqueId: boutique.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(templates)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const body = await request.json()
  const parsed = templateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  try {
    const template = await prisma.waTemplate.upsert({
      where: { boutiqueId_declencheur: { boutiqueId: boutique.id, declencheur: parsed.data.declencheur } },
      update: { nom: parsed.data.nom, contenu: parsed.data.contenu, actif: parsed.data.actif },
      create: { ...parsed.data, boutiqueId: boutique.id },
    })
    return NextResponse.json(template)
  } catch (error) {
    console.error('Template error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
