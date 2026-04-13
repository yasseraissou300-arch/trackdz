import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { processWhatsAppJob } from '@/workers/whatsappWorker'

const sendSchema = z.object({
  commandeId: z.string(),
  message: z.string().optional(), // manual message override
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const body = await request.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const commande = await prisma.commande.findFirst({
    where: { id: parsed.data.commandeId, boutiqueId: boutique.id },
  })
  if (!commande) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })

  try {
    await processWhatsAppJob({
      commandeId: commande.id,
      boutiqueId: boutique.id,
      statut: commande.statut,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send WhatsApp error:', error)
    return NextResponse.json({ error: 'Erreur envoi WhatsApp' }, { status: 500 })
  }
}
