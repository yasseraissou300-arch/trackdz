import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatutCommande } from '@prisma/client'

const STATE_MAP: Record<string, StatutCommande> = {
  'commande_recue':'EN_ATTENTE','commande reçue':'EN_ATTENTE','commande recue':'EN_ATTENTE',
  'pret_a_expedier':'EXPEDIE','prêt à expédier':'EXPEDIE',
  'vers_wilaya':'EN_TRANSIT','dispatch dans une autre wilaya':'EN_TRANSIT',
  'sortie_en_livraison':'EN_LIVRAISON','sortie en livraison':'EN_LIVRAISON',
  'dispatch':'EN_LIVRAISON','dispatch dans la même wilaya':'EN_LIVRAISON',
  'confirme_au_bureau':'EN_LIVRAISON','confirmé au bureau':'EN_LIVRAISON',
  'livre':'LIVRE','livré':'LIVRE','encaisse':'LIVRE','encaissé':'LIVRE',
  'recouvert':'RETOURNE','retourné':'RETOURNE',
  'retour_en_cours':'RETOUR_EN_COURS',
  'annulé':'ANNULE','annule':'ANNULE',
}
function mapState(s: string): StatutCommande { return STATE_MAP[s?.toLowerCase()?.trim()] || 'EN_ATTENTE' }

interface OrderRow { t: string; n: string; p: string; c: string; a: string; s: string; m: string; d: string }

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })
  const { orders } = await request.json() as { orders: OrderRow[] }
  if (!orders?.length) return NextResponse.json({ error: 'Aucune donnée' }, { status: 400 })
  let created = 0, skipped = 0, errors = 0
  for (const o of orders) {
    if (!o.t) { errors++; continue }
    const exists = await prisma.commande.findFirst({ where: { boutiqueId: boutique.id, trackingNumber: o.t, transporteur: 'ZREXPRESS' } })
    if (exists) { skipped++; continue }
    try {
      await prisma.commande.create({ data: {
        boutiqueId: boutique.id, reference: `ZR-${o.t}`, trackingNumber: o.t,
        transporteur: 'ZREXPRESS', statut: mapState(o.s), statutPrecedent: null,
        clientNom: o.n || 'Client ZR Express', clientTelephone: o.p || '',
        clientWilaya: o.c || '', clientAdresse: o.a || '',
        montant: o.m ? parseFloat(o.m.replace(/[^0-9.]/g,'')) || null : null,
        notes: o.d || null,
      }})
      created++
    } catch { errors++ }
  }
  return NextResponse.json({ success: true, created, skipped, errors, total: orders.length })
}