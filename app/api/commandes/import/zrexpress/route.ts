import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/utils/tracking'
import { StatutCommande } from '@prisma/client'

const ZR_STATE_MAP: Record<string, StatutCommande> = {
  'en attente': 'EN_ATTENTE',
  'confirmed': 'CONFIRME', 'confirmé': 'CONFIRME',
  'en préparation': 'EN_PREPARATION', 'en preparation': 'EN_PREPARATION',
  'expédié': 'EXPEDIE', 'expedié': 'EXPEDIE',
  'en transit': 'EN_TRANSIT',
  'en livraison': 'EN_LIVRAISON', 'en cours de livraison': 'EN_LIVRAISON',
  'livré': 'LIVRE', 'livre': 'LIVRE', 'delivered': 'LIVRE',
  'echec livraison': 'ECHEC_LIVRAISON', 'échec livraison': 'ECHEC_LIVRAISON', 'failed delivery': 'ECHEC_LIVRAISON',
  'retour en cours': 'RETOUR_EN_COURS',
  'retourné': 'RETOURNE', 'returned': 'RETOURNE',
  'annulé': 'ANNULE', 'cancelled': 'ANNULE',
}

function mapState(name: string): StatutCommande {
  return ZR_STATE_MAP[name.toLowerCase().trim()] || 'EN_ATTENTE'
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const integration = await prisma.integration.findFirst({
    where: { boutiqueId: boutique.id, transporteur: 'ZREXPRESS', actif: true },
  })
  if (!integration?.apiKey) {
    return NextResponse.json({ error: 'ZR Express non configuré. Allez dans Intégrations pour ajouter votre clé.' }, { status: 400 })
  }

  const apiKey = decryptApiKey(integration.apiKey)
  const tenantId = integration.apiSecret ? decryptApiKey(integration.apiSecret) : undefined

  const headers: Record<string, string> = {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  if (tenantId) headers['X-TenantId'] = tenantId

  try {
    // Fetch active parcels from ZR Express (paginated, up to 500)
    const allParcels: Record<string, unknown>[] = []
    for (let page = 0; page < 5; page++) {
      const res = await fetch('https://api.zrexpress.app/api/v1/parcels/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pageIndex: page, pageSize: 100 }),
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        if (res.status === 403) {
          return NextResponse.json({
            error: 'Accès refusé par ZR Express (403). Votre clé API ne permet pas encore la lecture des colis. Exportez vos commandes depuis ZR Express en CSV et importez le fichier manuellement.',
            code: 'API_FORBIDDEN'
          }, { status: 400 })
        }
        return NextResponse.json({ error: `Erreur ZR Express: ${res.status}` }, { status: 400 })
      }

      const data = await res.json()
      const items = (data.items || data.data || []) as Record<string, unknown>[]
      allParcels.push(...items)

      // Stop if less than 100 results (last page)
      if (items.length < 100) break
    }

    let created = 0
    let skipped = 0
    let errors = 0

    for (const parcel of allParcels) {
      const trackingNumber = parcel.trackingNumber as string
      if (!trackingNumber) continue

      // Skip if already in TrackDZ
      const exists = await prisma.commande.findFirst({
        where: { boutiqueId: boutique.id, trackingNumber, transporteur: 'ZREXPRESS' },
      })
      if (exists) { skipped++; continue }

      const state = parcel.state as Record<string, unknown> | undefined
      const stateName = (state?.name as string) || ''
      const statut = mapState(stateName)

      const customer = parcel.customer as Record<string, unknown> | undefined
      const phone = customer?.phone as Record<string, unknown> | undefined
      const addr = parcel.deliveryAddress as Record<string, unknown> | undefined

      try {
        await prisma.commande.create({
          data: {
            boutiqueId: boutique.id,
            reference: `ZR-${trackingNumber}`,
            trackingNumber,
            transporteur: 'ZREXPRESS',
            statut,
            statutPrecedent: null,
            clientNom: (customer?.name as string) || 'Client ZR Express',
            clientTelephone: (phone?.number1 as string) || '',
            clientWilaya: (addr?.city as string) || (addr?.district as string) || '',
            clientAdresse: (addr?.street as string) || '',
            montant: typeof parcel.amount === 'number' ? parcel.amount : null,
          },
        })
        created++
      } catch {
        errors++
      }
    }

    return NextResponse.json({ success: true, created, skipped, errors, total: allParcels.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erreur: ${msg}` }, { status: 500 })
  }
}