import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ZrExpressAdapter } from '@/lib/transporteurs/zrexpress'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp/queue'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const eventType = payload.eventType as string
    const data = payload.data as Record<string, unknown>

    if (!eventType?.startsWith('parcel.state') && eventType !== 'parcel.isReturn.updated') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 })
    }

    const trackingNumber = data?.trackingNumber as string
    if (!trackingNumber) {
      return NextResponse.json({ error: 'Missing trackingNumber' }, { status: 400 })
    }

    const state = data?.state as Record<string, unknown> | undefined
    const stateName = (state?.name as string) || ''

    const adapter = new ZrExpressAdapter()
    const statut = adapter.parseStatut(stateName)

    const commande = await prisma.commande.findFirst({
      where: { trackingNumber, transporteur: 'ZREXPRESS' },
    })

    if (!commande) {
      return NextResponse.json({ message: 'Commande non trouvee, ignore' }, { status: 200 })
    }

    const deliveryAddress = data?.deliveryAddress as Record<string, unknown> | undefined
    const wilaya = (deliveryAddress?.city as string) || undefined

    if (statut !== commande.statut) {
      await prisma.commande.update({
        where: { id: commande.id },
        data: {
          statut,
          statutPrecedent: commande.statut,
          dateExpedition: statut === 'EXPEDIE' && !commande.dateExpedition ? new Date() : undefined,
          dateLivraison: statut === 'LIVRE' ? new Date() : undefined,
          dateRetour: statut === 'RETOURNE' ? new Date() : undefined,
        },
      })

      await prisma.trackingEvent.create({
        data: {
          commandeId: commande.id,
          statut,
          description: stateName,
          wilaya,
          rawData: payload as object,
        },
      })

      await enqueueWhatsAppMessage({
        commandeId: commande.id,
        boutiqueId: commande.boutiqueId,
        statut,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ZR Express webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}