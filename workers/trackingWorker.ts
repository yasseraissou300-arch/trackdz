import { prisma } from '@/lib/prisma'
import { getAdapter } from '@/lib/transporteurs/index'
import { enqueueWhatsAppMessage } from '@/lib/whatsapp/queue'
import { StatutCommande, Transporteur } from '@prisma/client'
import { decryptApiKey } from '@/lib/utils/tracking'

const ACTIVE_STATUTS: StatutCommande[] = [
  'CONFIRME',
  'EN_PREPARATION',
  'EXPEDIE',
  'EN_TRANSIT',
  'EN_LIVRAISON',
  'ECHEC_LIVRAISON',
  'RETOUR_EN_COURS',
]

export async function runTrackingSync(boutiqueId?: string): Promise<{
  synced: number
  updated: number
  errors: number
}> {
  let synced = 0
  let updated = 0
  let errors = 0

  // Get all boutiques with active integrations
  const boutiques = await prisma.boutique.findMany({
    where: boutiqueId ? { id: boutiqueId } : undefined,
    include: {
      integrations: { where: { actif: true } },
    },
  })

  for (const boutique of boutiques) {
    for (const integration of boutique.integrations) {
      if (!integration.apiKey) continue

      // Get active commandes for this transporteur
      const commandes = await prisma.commande.findMany({
        where: {
          boutiqueId: boutique.id,
          transporteur: integration.transporteur,
          statut: { in: ACTIVE_STATUTS },
          trackingNumber: { not: null },
        },
        take: 100,
      })

      if (commandes.length === 0) continue

      const AdapterClass = getAdapter(integration.transporteur as Transporteur)
      const adapter = new AdapterClass()
      const apiKey = decryptApiKey(integration.apiKey)

      for (const commande of commandes) {
        if (!commande.trackingNumber) continue
        synced++

        try {
          const result = await adapter.getTracking(commande.trackingNumber, apiKey)

          if (result.statut !== commande.statut) {
            // Status changed — update commande
            updated++

            await prisma.commande.update({
              where: { id: commande.id },
              data: {
                statut: result.statut,
                statutPrecedent: commande.statut,
                dateExpedition:
                  result.statut === 'EXPEDIE' && !commande.dateExpedition
                    ? new Date()
                    : undefined,
                dateLivraison: result.statut === 'LIVRE' ? new Date() : undefined,
                dateRetour:
                  result.statut === 'RETOURNE' ? new Date() : undefined,
              },
            })

            // Create tracking event
            await prisma.trackingEvent.create({
              data: {
                commandeId: commande.id,
                statut: result.statut,
                description: result.description,
                wilaya: result.wilaya,
                rawData: { source: 'polling' },
              },
            })

            // Enqueue WhatsApp notification
            await enqueueWhatsAppMessage({
              commandeId: commande.id,
              boutiqueId: boutique.id,
              statut: result.statut,
            })
          }

          // Add history events that are new
          for (const event of result.historique) {
            const exists = await prisma.trackingEvent.findFirst({
              where: {
                commandeId: commande.id,
                statut: event.statut,
                createdAt: {
                  gte: new Date(event.dateEvenement.getTime() - 60000),
                  lte: new Date(event.dateEvenement.getTime() + 60000),
                },
              },
            })
            if (!exists) {
              await prisma.trackingEvent.create({
                data: {
                  commandeId: commande.id,
                  statut: event.statut,
                  description: event.description,
                  wilaya: event.wilaya,
                  createdAt: event.dateEvenement,
                },
              })
            }
          }
        } catch (error) {
          errors++
          console.error(
            `Tracking error for commande ${commande.reference} (${integration.transporteur}):`,
            error
          )
        }

        // Rate limiting: 100ms between requests
        await new Promise((r) => setTimeout(r, 100))
      }

      // Update integration last sync
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date(), syncError: null },
      })
    }
  }

  return { synced, updated, errors }
}
