import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatutCommande } from '@prisma/client'

// ZR Express state name -> TrackDZ status
const STATE_MAP: Record<string, StatutCommande> = {
  'commande recue': 'EN_ATTENTE', 'commande reçue': 'EN_ATTENTE',
  'en attente': 'EN_ATTENTE',
  'confirmé': 'CONFIRME', 'confirmed': 'CONFIRME', 'pret a expedier': 'CONFIRME', 'prêt à expédier': 'CONFIRME',
  'en préparation': 'EN_PREPARATION', 'en preparation': 'EN_PREPARATION',
  'expédié': 'EXPEDIE', 'dispatch dans une autre wilaya': 'EXPEDIE', 'au bureau': 'EXPEDIE',
  'en transit': 'EN_TRANSIT', 'vers wilaya': 'EN_TRANSIT',
  'en livraison': 'EN_LIVRAISON', 'en cours de livraison': 'EN_LIVRAISON', 'dispatch': 'EN_LIVRAISON',
  'livré': 'LIVRE', 'livre': 'LIVRE', 'delivered': 'LIVRE',
  'echec livraison': 'ECHEC_LIVRAISON', 'échec livraison': 'ECHEC_LIVRAISON',
  'retour en cours': 'RETOUR_EN_COURS',
  'retourné': 'RETOURNE', 'returned': 'RETOURNE',
  'annulé': 'ANNULE', 'cancelled': 'ANNULE',
}

function parseStatut(raw: string): StatutCommande {
  return STATE_MAP[raw.toLowerCase().trim()] || 'EN_ATTENTE'
}

// Parse CSV text (handles comma and semicolon separators)
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  // Detect separator
  const sep = lines[0].includes(';') ? ';' : ','
  // Parse header, normalize
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.replace(/^"|"$/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
}

// Find value from row using multiple possible column names
function col(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(n.toLowerCase()))
    if (key && row[key]?.trim()) return row[key].trim()
  }
  return ''
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Boutique non trouvée' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

  const text = await file.text()
  const rows = parseCsv(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Fichier vide ou format invalide. Colonnes attendues: Numéro de suivi, Client, Numéro de téléphone...' }, { status: 400 })
  }

  let created = 0, skipped = 0, errors = 0

  for (const row of rows) {
    const trackingNumber = col(row, 'numéro de suivi', 'numero de suivi', 'tracking', 'suivi', 'numero_suivi', 'tracking_number')
    if (!trackingNumber) { errors++; continue }

    // Skip if already in TrackDZ
    const exists = await prisma.commande.findFirst({
      where: { boutiqueId: boutique.id, trackingNumber, transporteur: 'ZREXPRESS' },
    })
    if (exists) { skipped++; continue }

    const clientNom = col(row, 'client', 'nom', 'name', 'customer')
    const clientTelephone = col(row, 'téléphone', 'telephone', 'phone', 'mobile', 'numéro de téléphone')
    const clientWilaya = col(row, 'wilaya', 'ville', 'city', 'commune')
    const clientAdresse = col(row, 'adresse', 'address', 'rue')
    const statut = parseStatut(col(row, 'statut', 'status', 'état', 'etat'))
    const montantRaw = col(row, 'montant', 'prix', 'price', 'amount', 'cod')
    const montant = montantRaw ? parseFloat(montantRaw.replace(/[^0-9.]/g, '')) || null : null

    try {
      await prisma.commande.create({
        data: {
          boutiqueId: boutique.id,
          reference: `ZR-${trackingNumber}`,
          trackingNumber,
          transporteur: 'ZREXPRESS',
          statut,
          statutPrecedent: null,
          clientNom: clientNom || 'Client ZR Express',
          clientTelephone,
          clientWilaya,
          clientAdresse,
          montant,
        },
      })
      created++
    } catch { errors++ }
  }

  return NextResponse.json({ success: true, created, skipped, errors, total: rows.length })
}