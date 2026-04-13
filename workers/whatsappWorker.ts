import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/whatsapp/ultramsg'
import { renderTemplate } from '@/lib/whatsapp/templates'
import { formatPhoneAlgeria, generateTrackingUrl } from '@/lib/utils/tracking'
import { TRANSPORTEUR_LABELS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'

export interface WhatsAppJob {
  commandeId: string
  boutiqueId: string
  statut: string
}

export async function processWhatsAppJob(job: WhatsAppJob): Promise<void> {
  const { commandeId, boutiqueId, statut } = job

  // Get boutique config
  const boutique = await prisma.boutique.findUnique({
    where: { id: boutiqueId },
  })

  if (!boutique?.whatsappInstanceId || !boutique?.whatsappToken) {
    console.log(`No WhatsApp config for boutique ${boutiqueId}`)
    return
  }

  // Get active template for this statut
  const template = await prisma.waTemplate.findFirst({
    where: {
      boutiqueId,
      declencheur: statut as StatutCommande,
      actif: true,
    },
  })

  if (!template) {
    console.log(`No active template for statut ${statut} in boutique ${boutiqueId}`)
    return
  }

  // Get commande details
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
  })

  if (!commande) return

  // Check plan limits
  const planLimits = { STARTER: 1000, PRO: 999999, ENTERPRISE: 999999 }
  const limit = planLimits[boutique.commandesCount > 0 ? 'STARTER' : 'STARTER'] || 1000
  if (boutique.messagesCount >= limit) {
    console.log(`WhatsApp quota exceeded for boutique ${boutiqueId}`)
    return
  }

  // Build variables
  const prenom = commande.clientNom.split(' ')[0]
  const message = renderTemplate(template.contenu, {
    prenom,
    nom_complet: commande.clientNom,
    num_commande: commande.reference,
    tracking: commande.trackingNumber || '',
    transporteur: TRANSPORTEUR_LABELS[commande.transporteur],
    wilaya: commande.clientWilaya,
    montant: commande.montant ? `${commande.montant} DA` : '',
    lien_suivi: commande.trackingNumber
      ? generateTrackingUrl(commande.trackingNumber)
      : generateTrackingUrl(commande.reference),
  })

  const telephone = formatPhoneAlgeria(commande.clientTelephone)

  // Create message record
  const waMessage = await prisma.waMessage.create({
    data: {
      commandeId,
      telephone,
      contenu: message,
      statut: 'EN_ATTENTE',
    },
  })

  try {
    // Send via UltraMsg
    const result = await sendWhatsApp({
      instanceId: boutique.whatsappInstanceId,
      token: boutique.whatsappToken,
      to: telephone,
      message,
    })

    // Update message status
    await prisma.waMessage.update({
      where: { id: waMessage.id },
      data: {
        statut: 'ENVOYE',
        messageId: result.id,
        sentAt: new Date(),
      },
    })

    // Update template sent count
    await prisma.waTemplate.update({
      where: { id: template.id },
      data: { sentCount: { increment: 1 } },
    })

    // Update boutique message count
    await prisma.boutique.update({
      where: { id: boutiqueId },
      data: { messagesCount: { increment: 1 } },
    })

    console.log(`WhatsApp sent to ${telephone} for commande ${commande.reference}`)
  } catch (error) {
    // Update message status to ECHEC
    await prisma.waMessage.update({
      where: { id: waMessage.id },
      data: { statut: 'ECHEC' },
    })
    console.error(`Failed to send WhatsApp for commande ${commande.reference}:`, error)
    throw error
  }
}
