import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEFAULT_TEMPLATES } from '../lib/whatsapp/templates'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@trackdz.com' },
    update: {},
    create: {
      email: 'demo@trackdz.com',
      name: 'Demo User',
      password: hashedPassword,
      plan: 'PRO',
    },
  })

  console.log('✅ User created:', user.email)

  // Create boutique
  const boutique = await prisma.boutique.upsert({
    where: { apiKey: 'tdz_demo_key_123' },
    update: {},
    create: {
      userId: user.id,
      nom: 'Boutique Demo DZ',
      apiKey: 'tdz_demo_key_123',
    },
  })

  console.log('✅ Boutique created:', boutique.nom)

  // Create default WhatsApp templates
  for (const [, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
    await prisma.waTemplate.upsert({
      where: { boutiqueId_declencheur: { boutiqueId: boutique.id, declencheur: tmpl.declencheur } },
      update: {},
      create: {
        boutiqueId: boutique.id,
        nom: tmpl.nom,
        declencheur: tmpl.declencheur,
        contenu: tmpl.contenu,
        actif: true,
      },
    })
  }

  console.log('✅ WhatsApp templates created')

  // Create sample commandes
  const wilayas = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Tizi Ouzou', 'Béjaïa', 'Sétif']
  const statuts = ['EN_ATTENTE', 'EXPEDIE', 'EN_TRANSIT', 'EN_LIVRAISON', 'LIVRE', 'ECHEC_LIVRAISON'] as const
  const transporteurs = ['YALIDINE', 'ZREXPRESS', 'MAYSTRO'] as const
  const prenoms = ['Ahmed', 'Mohamed', 'Karim', 'Youcef', 'Sofiane', 'Bilal', 'Rachid', 'Hamza']
  const noms = ['Benali', 'Bouzid', 'Amrani', 'Cherif', 'Mansouri', 'Talbi', 'Khelifi', 'Benkhaled']

  for (let i = 0; i < 20; i++) {
    const prenom = prenoms[i % prenoms.length]
    const nom = noms[Math.floor(i / prenoms.length) % noms.length]
    const transporteur = transporteurs[i % transporteurs.length]
    const statut = statuts[i % statuts.length]
    const wilaya = wilayas[i % wilayas.length]

    const commande = await prisma.commande.upsert({
      where: { boutiqueId_reference: { boutiqueId: boutique.id, reference: `CMD-2024-${String(i + 1).padStart(3, '0')}` } },
      update: {},
      create: {
        boutiqueId: boutique.id,
        reference: `CMD-2024-${String(i + 1).padStart(3, '0')}`,
        trackingNumber: `${transporteur.slice(0, 3)}${100000 + i}`,
        transporteur,
        statut,
        clientNom: `${prenom} ${nom}`,
        clientTelephone: `055${String(1000000 + i * 7)}`,
        clientWilaya: wilaya,
        montant: Math.round((Math.random() * 8000 + 1000) / 100) * 100,
        dateCreation: new Date(Date.now() - i * 86400000 * 2),
        dateLivraison: statut === 'LIVRE' ? new Date(Date.now() - i * 86400000) : null,
      },
    })

    // Create tracking events
    await prisma.trackingEvent.upsert({
      where: { id: `seed-event-${i}` },
      update: {},
      create: {
        id: `seed-event-${i}`,
        commandeId: commande.id,
        statut,
        description: `Commande ${statut.toLowerCase().replace(/_/g, ' ')}`,
        wilaya,
      },
    })
  }

  console.log('✅ Sample commandes created')
  console.log('\n🎉 Seed completed!')
  console.log('📧 Login: demo@trackdz.com')
  console.log('🔑 Password: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
