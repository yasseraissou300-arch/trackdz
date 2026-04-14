import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatutCommande } from '@prisma/client'

// ZR Express state names (from State.Name and State.Description columns)
const STATE_MAP: Record<string, StatutCommande> = {
  // ZR Express native state names
  'commande_recue': 'EN_ATTENTE', 'commande reçue': 'EN_ATTENTE', 'commande recue': 'EN_ATTENTE',
  'pret_a_expedier': 'EXPEDIE', 'prêt à expédier': 'EXPEDIE', 'pret a expedier': 'EXPEDIE',
  'vers_wilaya': 'EN_TRANSIT', 'dispatch dans une autre wilaya': 'EN_TRANSIT',
  'sortie_en_livraison': 'EN_LIVRAISON', 'sortie en livraison': 'EN_LIVRAISON',
  'dispatch': 'EN_LIVRAISON', 'dispatch dans la même wilaya': 'EN_LIVRAISON',
  'confirme_au_bureau': 'EN_LIVRAISON', 'confirmé au bureau': 'EN_LIVRAISON',
  'livre': 'LIVRE', 'livré': 'LIVRE', 'delivered': 'LIVRE',
  'encaisse': 'LIVRE', 'encaissé': 'LIVRE',
  'recouvert': 'RETOURNE', 'retourné': 'RETOURNE', 'returned': 'RETOURNE',
  'retour_en_cours': 'RETOUR_EN_COURS', 'retour en cours': 'RETOUR_EN_COURS',
  'annulé': 'ANNULE', 'annule': 'ANNULE', 'cancelled': 'ANNULE',
  // Generic
  'en attente': 'EN_ATTENTE', 'confirmé': 'CONFIRME', 'confirmed': 'CONFIRME',
  'expédié': 'EXPEDIE', 'en transit': 'EN_TRANSIT', 'en livraison': 'EN_LIVRAISON',
  'echec livraison': 'ECHEC_LIVRAISON', 'échec livraison': 'ECHEC_LIVRAISON',
}

function parseStatut(raw: string): StatutCommande {
  if (!raw) return 'EN_ATTENTE'
  const k = raw.toLowerCase().trim()
  return STATE_MAP[k] || 'EN_ATTENTE'
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuote = !inQuote }
    else if (c === sep && !inQuote) { result.push(cur.trim()); cur = '' }
    else { cur += c }
  }
  result.push(cur.trim())
  return result
}

function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = parseCsvLine(lines[0], sep)
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line, sep)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
}

// Find column value by trying multiple possible names (case-insensitive substring match)
function col(row: Record<string, string>, ...names: string[]): string {
  const keys = Object.keys(row)
  for (const n of names) {
    const key = keys.find(k => k.toLowerCase().includes(n.toLowerCase()))
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
    return NextResponse.json({ error: 'Fichier vide ou format non reconnu.' }, { status: 400 })
  }

  let created = 0, skipped = 0, errors = 0

  for (const row of rows) {
    // ZR Express columns: TrackingNumber, Customer.Name, Customer.Phone.Number1, DeliveryAddress.City, State.Name, TotalAmount
    const trackingNumber = col(row, 'TrackingNumber', 'tracking', 'suivi')
    if (!trackingNumber) { errors++; continue }

    const exists = await prisma.commande.findFirst({
      where: { boutiqueId: boutique.id, trackingNumber, transporteur: 'ZREXPRESS' },
    })
    if (exists) { skipped++; continue }

    const clientNom = col(row, 'Customer.Name', 'customer.name', 'client', 'nom', 'name')
    const clientTelephone = col(row, 'Customer.Phone.Number1', 'phone.number1', 'phone', 'telephone', 'téléphone')
    const clientWilaya = col(row, 'DeliveryAddress.City', 'deliveryaddress.city', 'city', 'wilaya', 'ville')
    const clientAdresse = col(row, 'DeliveryAddress.Street', 'street', 'adresse', 'address')
    // Try State.Name first, then State.Description
    const stateRaw = col(row, 'State.Name', 'state.name') || col(row, 'State.Description', 'state.description', 'state')
    const statut = parseStatut(stateRaw)
    const montantRaw = col(row, 'TotalAmount', 'totalamount', 'montant', 'amount', 'prix', 'cod')
    const montant = montantRaw ? parseFloat(montantRaw.replace(/[^0-9.]/g, '')) || null : null
    const produits = col(row, 'ProductsDescription', 'products', 'produits', 'description')

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
          notes: produits || null,
        },
      })
      created++
    } catch { errors++ }
  }

  return NextResponse.json({ success: true, created, skipped, errors, total: rows.length })
}