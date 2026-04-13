import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  nom: z.string().min(1).optional(),
  siteUrl: z.string().url().optional().or(z.literal('')),
  whatsappNumero: z.string().optional(),
  whatsappInstanceId: z.string().optional(),
  whatsappToken: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      nom: true,
      siteUrl: true,
      whatsappNumero: true,
      whatsappInstanceId: true,
      apiKey: true,
      commandesCount: true,
      messagesCount: true,
      createdAt: true,
    },
  })

  return NextResponse.json(boutique)
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const boutique = await prisma.boutique.findFirst({ where: { userId: session.user.id } })
  if (!boutique) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const updated = await prisma.boutique.update({
    where: { id: boutique.id },
    data: parsed.data,
    select: {
      id: true,
      nom: true,
      siteUrl: true,
      whatsappNumero: true,
      whatsappInstanceId: true,
      apiKey: true,
    },
  })

  return NextResponse.json(updated)
}
