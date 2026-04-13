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
    const res = await fetch('https://zrexpress.dz/api/v1/commandes?page=1&per_page=1', {
      headers: { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Clé API invalide — accès refusé (401/403)' }
    if (res.status === 200 || res.status === 204 || res.status === 404) return { ok: true, message: 'Connexion ZR Express réussie !' }
    const res2 = await fetch('https://zrexpress.dz/api/commandes?limit=1', {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (res2.status === 401 || res2.status === 403) return { ok: false, message: 'Clé API invalide — accès refusé' }
    if (res2.ok || res2.status === 404) return { ok: true, message: 'Connexion ZR Express réussie !' }
    return { ok: false, message: `Erreur API ZR Express (${res2.status})` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout') || msg.includes('abort')) return { ok: false, message: 'Délai dépassé — API ZR Express inaccessible' }
    return { ok: false, message: `Impossible de contacter ZR Express : ${msg}` }
  }
}

async function testYalidine(apiKey, apiSecret) {
  try {
    const res = await fetch('https://api.yalidine.app/v1/wilayas/', {
      headers: { 'X-API-ID': apiKey, 'X-API-TOKEN': apiSecret },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'ID ou Token Yalidine invalide' }
    if (res.ok) return { ok: true, message: 'Connexion Yalidine réussie !' }
    return { ok: false, message: `Erreur Yalidine (${res.status})` }
  } catch { return { ok: false, message: 'Impossible de contacter Yalidine' } }
}

async function testMaystro(apiKey) {
  try {
    const res = await fetch('https://api.maystro-delivery.com/v1/parcels?page_size=1', {
      headers: { 'Authorization': `Token ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Clé API Maystro invalide' }
    if (res.ok || res.status === 404) return { ok: true, message: 'Connexion Maystro réussie !' }
    return { ok: false, message: `Erreur Maystro (${res.status})` }
  } catch { return { ok: false, message: 'Impossible de contacter Maystro' } }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await request.json()
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Données invalides' }, { status: 400 })
  const { transporteur, apiKey, apiSecret } = parsed.data
  let result
  switch (transporteur) {
    case 'ZREXPRESS': result = await testZrExpress(apiKey); break
    case 'YALIDINE': result = await testYalidine(apiKey, apiSecret || ''); break
    case 'MAYSTRO': result = await testMaystro(apiKey); break
    default: result = { ok: true, message: 'Clé sauvegardée (test non disponible pour ce transporteur)' }
  }
  return NextResponse.json(result)
}
