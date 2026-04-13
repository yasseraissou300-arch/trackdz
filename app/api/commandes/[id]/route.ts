import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  statut: z.enum(['EN_ATTENTE','CONFIRME','EN_PREPARATION','EXPEDIE','EN_TRANSIT','EN_LIVRAISON','LIVRE','ECHEC_LIVRAISON','RETOUR_EN_COURS','RETOURNE','ANNULE']).optional(),
  trackingNumber: z.string().optional(),
  clientNom: z.string().optional(),
  clientTelephone: z.string().optional(),
  clientWilaya: z.string().optional(),
  clientAdresse: z.string().optional(),
  montant: z.number().optional(),
  notes: z.string().optional(),
})

async function getCommandeForUser(id: string, userId: string) {
  const boutique = await prisma.boutique.findFirst({ where: { userId } })
  if (!boutique) return null
  return prisma.commande.findFirst({
    where: { id, boutiqueId: boutique.id },
    include: {
      waMessages: { orderBy: { createdAt: 'desc' } },
      historique: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const commande = await getCommandeForUser(id, session.user.id)
  if (!commande) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })

  return NextResponse.json(commande)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const commande = await prisma.commande.findFirst({
    where: { id, boutiqueId: boutique.id },
  })
  if (!commande) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const updates: Record<string, unknown> = { ...parsed.data }

  // Handle status change
  if (parsed.data.statut && parsed.data.statut !== commande.statut) {
    updates.statutPrecedent = commande.statut

    if (parsed.data.statut === 'EXPEDIE') updates.dateExpedition = new Date()
    if (parsed.data.statut === 'LIVRE') updates.dateLivraison = new Date()
    if (parsed.data.statut === 'RETOURNE') updates.dateRetour = new Date()

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        commandeId: id,
        statut: parsed.data.statut,
        description: 'Statut mis à jour manuellement',
      },
    })

    // Trigger WhatsApp notification
    const { enqueueWhatsAppMessage } = await import('@/lib/whatsapp/queue')
    await enqueueWhatsAppMessage({
      commandeId: id,
      boutiqueId: boutique.id,
      statut: parsed.data.statut,
    })
  }

  const updated = await prisma.commande.update({
    where: { id },
    data: updates,
    include: {
      waMessages: { orderBy: { createdAt: 'desc' } },
      historique: { orderBy: { createdAt: 'asc' } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const commande = await prisma.commande.findFirst({
    where: { id, boutiqueId: boutique.id },
  })
  if (!commande) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  await prisma.commande.delete({ where: { id } })
  await prisma.boutique.update({
    where: { id: boutique.id },
    data: { commandesCount: { decrement: 1 } },
  })

  return NextResponse.json({ success: true })
}
