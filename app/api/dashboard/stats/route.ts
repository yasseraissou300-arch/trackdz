import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, format } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const sevenDaysAgo = subDays(now, 7)
  const yesterday = subDays(now, 1)
  const todayStart = startOfDay(now)

  const [
    commandesActives,
    commandesLivrees,
    commandesTotal,
    commandesRetour,
    commandesRetourHier,
    messagesAujourdhui,
    commandesParJour,
    repartitionTransporteur,
    repartitionStatut,
    derniersMouvements,
  ] = await Promise.all([
    // Commandes actives
    prisma.commande.count({
      where: {
        boutiqueId: boutique.id,
        statut: { in: ['CONFIRME', 'EN_PREPARATION', 'EXPEDIE', 'EN_TRANSIT', 'EN_LIVRAISON'] },
      },
    }),

    // Commandes livrées ce mois
    prisma.commande.count({
      where: {
        boutiqueId: boutique.id,
        statut: 'LIVRE',
        dateLivraison: { gte: thirtyDaysAgo },
      },
    }),

    // Total commandes ce mois
    prisma.commande.count({
      where: {
        boutiqueId: boutique.id,
        dateCreation: { gte: thirtyDaysAgo },
      },
    }),

    // Commandes en retour
    prisma.commande.count({
      where: {
        boutiqueId: boutique.id,
        statut: { in: ['RETOUR_EN_COURS', 'RETOURNE'] },
      },
    }),

    // Retour hier
    prisma.commande.count({
      where: {
        boutiqueId: boutique.id,
        statut: { in: ['RETOUR_EN_COURS', 'RETOURNE'] },
        updatedAt: { lt: todayStart, gte: startOfDay(yesterday) },
      },
    }),

    // Messages WhatsApp aujourd'hui
    prisma.waMessage.count({
      where: {
        commande: { boutiqueId: boutique.id },
        createdAt: { gte: todayStart },
      },
    }),

    // Commandes par jour (30 derniers jours)
    prisma.commande.findMany({
      where: {
        boutiqueId: boutique.id,
        dateCreation: { gte: thirtyDaysAgo },
      },
      select: { dateCreation: true },
    }),

    // Répartition par transporteur
    prisma.commande.groupBy({
      by: ['transporteur'],
      where: { boutiqueId: boutique.id },
      _count: true,
    }),

    // Répartition par statut
    prisma.commande.groupBy({
      by: ['statut'],
      where: { boutiqueId: boutique.id },
      _count: true,
    }),

    // Dernières activités
    prisma.trackingEvent.findMany({
      where: { commande: { boutiqueId: boutique.id } },
      include: { commande: { select: { reference: true, clientNom: true, transporteur: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // Build commandes par jour chart data
  const dayMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(now, i), 'dd/MM')
    dayMap.set(d, 0)
  }
  for (const cmd of commandesParJour) {
    const d = format(new Date(cmd.dateCreation), 'dd/MM')
    if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + 1)
  }

  // 7-day sparkline for commandes actives
  const sparklineMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    sparklineMap.set(format(subDays(now, i), 'dd/MM'), 0)
  }
  for (const cmd of commandesParJour) {
    const d = format(new Date(cmd.dateCreation), 'dd/MM')
    if (sparklineMap.has(d)) sparklineMap.set(d, (sparklineMap.get(d) || 0) + 1)
  }

  const tauxLivraison = commandesTotal > 0 ? Math.round((commandesLivrees / commandesTotal) * 100) : 0

  return NextResponse.json({
    metrics: {
      commandesActives,
      tauxLivraison,
      messagesAujourdhui,
      commandesRetour,
      commandesRetourVariation: commandesRetour - commandesRetourHier,
    },
    charts: {
      commandesParJour: Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })),
      repartitionTransporteur: repartitionTransporteur.map((r) => ({
        transporteur: r.transporteur,
        count: r._count,
      })),
      repartitionStatut: repartitionStatut.map((r) => ({
        statut: r.statut,
        count: r._count,
      })),
      sparkline: Array.from(sparklineMap.values()),
    },
    activite: derniersMouvements,
  })
}
