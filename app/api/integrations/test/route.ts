import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const testSchema = z.object({
  transporteur: z.enum(['YALIDINE', 'ZREXPRESS', 'MAYSTRO', 'AMANA', 'PROCOLIS', 'ECOTRACK']),
  apiKey: z.string().min(1),
  apiSecret: z.string().optional(),
})

async function testZrExpress(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    // Use the real tracking endpoint with a dummy number
    // 401/403 = bad key, 404/422 = key valid (tracking number just doesn't exist)
    const res = await fetch('https://zrexpress.dz/api/tracking/TESTCONNECTION', {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Clé API invalide — accès refusé (401/403)' }
    }
    if (res.status === 404 || res.status === 200 || res.status === 422) {
      return { ok: true, message: 'Connexion ZR Express réussie !' }
    }
    return { ok: false, message: `Erreur API ZR Express (${res.status})` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { ok: false, message: 'Délai dépassé — API ZR Express inaccessible' }
    }
    return { ok: false, message: `Impossible de contacter ZR Express : ${msg}` }
  }
}

async function testYalidine(apiKey: string, apiSecret: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.yalidine.app/v1/wilayas/', {
      headers: {
        'X-API-ID': apiKey,
        'X-API-TOKEN': apiSecret,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'ID ou Token Yalidine invalide' }
    }
    if (res.ok) return { ok: true, message: 'Connexion Yalidine réussie !' }
    return { ok: false, message: `Erreur Yalidine (${res.status})` }
  } catch {
    return { ok: false, message: 'Impossible de contacter Yalidine' }
  }
}

async function testMaystro(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.maystro-delivery.com/v1/parcels?page_size=1', {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Clé API Maystro invalide' }
    }
    if (res.ok || res.status === 404) return { ok: true, message: 'Connexion Maystro réussie !' }
    return { ok: false, message: `Erreur Maystro (${res.status})` }
  } catch {
    return { ok: false, message: 'Impossible de contacter Maystro' }
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Données invalides' }, { status: 400 })
  }

  const { transporteur, apiKey, apiSecret } = parsed.data

  let result: { ok: boolean; message: string }

  switch (transporteur) {
    case 'ZREXPRESS':
      result = await testZrExpress(apiKey)
      break
    case 'YALIDINE':
      result = await testYalidine(apiKey, apiSecret || '')
      break
    case 'MAYSTRO':
      result = await testMaystro(apiKey)
      break
    default:
      result = { ok: true, message: 'Clé sauvegardée (test non disponible pour ce transporteur)' }
  }

  return NextResponse.json(result)
}
