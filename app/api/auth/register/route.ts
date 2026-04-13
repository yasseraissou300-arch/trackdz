import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { DEFAULT_TEMPLATES } from '@/lib/whatsapp/templates'
import { encryptApiKey } from '@/lib/utils/tracking'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  boutiqueName: z.string().min(2),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const { name, email, password, boutiqueName } = parsed.data

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user + boutique in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          plan: 'STARTER',
        },
      })

      const boutique = await tx.boutique.create({
        data: {
          userId: newUser.id,
          nom: boutiqueName,
          apiKey: `tdz_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        },
      })

      // Create default WhatsApp templates
      for (const [, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
        await tx.waTemplate.create({
          data: {
            boutiqueId: boutique.id,
            nom: tmpl.nom,
            declencheur: tmpl.declencheur,
            contenu: tmpl.contenu,
            actif: true,
          },
        })
      }

      return newUser
    })

    return NextResponse.json({
      message: 'Compte créé avec succès',
      userId: user.id,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
