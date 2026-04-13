import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { YalidineAdapter } from '@/lib/transporteurs/yalidine'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp/queue'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const adapter = new YalidineAdapter()
    const event = adapter.parseWebhook(payload)

    if (!event.trackingNumber) {
      return NextResponse.json({ error: 'Missing tracking number' }, { status: 400 })
    }

    // Find commande by tracking number
    const commande = await prisma.commande.findFirst({
      where: { trackingNumber: event.trackingNumber, transporteur: 'YALIDINE' },
    })

    if (!commande) {
      return NextResponse.json({ message: 'Commande non trouvée' }, { status: 200 })
    }

    if (event.statut !== commande.statut) {
      await prisma.commande.update({
        where: { id: commande.id },
        data: {
          statut: event.statut,
          statutPrecedent: commande.statut,
          dateExpedition: event.statut === 'EXPEDIE' && !commande.dateExpedition ? new Date() : undefined,
          dateLivraison: event.statut === 'LIVRE' ? new Date() : undefined,
          dateRetour: event.statut === 'RETOURNE' ? new Date() : undefined,
        },
      })

      await prisma.trackingEvent.create({
        data: {
          commandeId: commande.id,
          statut: event.statut,
          description: event.description,
          wilaya: event.wilaya,
          rawData: event.rawData as object,
        },
      })

      await enqueueWhatsAppMessage({
        commandeId: commande.id,
        boutiqueId: commande.boutiqueId,
        statut: event.statut,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Yalidine webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
