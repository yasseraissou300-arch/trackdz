import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { transporteur, apiKey, apiSecret } = body

  if (!transporteur || !apiKey) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  let result: { ok: boolean; message: string }

  switch (transporteur) {
    case 'ZREXPRESS':
      result = await testZrExpress(apiKey, apiSecret)
      break
    case 'YALIDINE':
      result = await testYalidine(apiKey, apiSecret)
      break
    case 'MAYSTRO':
      result = await testMaystro(apiKey)
      break
    default:
      result = { ok: true, message: 'Connexion acceptée' }
  }

  return NextResponse.json(result)
}

async function testZrExpress(apiKey: string, tenantId?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      'Accept': 'application/json',
    }
    if (tenantId) headers['X-TenantId'] = tenantId

    const res = await fetch('https://api.zrexpress.app/api/v1/users/profile', {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    const bodyText = await res.text()

    // API not reachable from this server (IP restriction) — save anyway
    if (bodyText.trimStart().startsWith('<') || bodyText === '') {
      return {
        ok: true,
        message: 'Clé ZR Express sauvegardée. Elle sera vérifiée lors de la première synchronisation.',
      }
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Clé API invalide — accès refusé par ZR Express' }
    }

    if (res.status === 200) {
      try {
        const data = JSON.parse(bodyText)
        const name = data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : ''
        return {
          ok: true,
          message: name
            ? `Connexion ZR Express réussie ! Compte : ${name}`
            : 'Connexion ZR Express réussie !',
        }
      } catch {
        return { ok: true, message: 'Connexion ZR Express réussie !' }
      }
    }

    return { ok: false, message: `Erreur API ZR Express (status ${res.status})` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout') || msg.includes('abort')) {
      return {
        ok: true,
        message: 'Clé ZR Express sauvegardée. Elle sera vérifiée lors de la première synchronisation.',
      }
    }
    return { ok: false, message: `Impossible de contacter ZR Express : ${msg}` }
  }
}

async function testYalidine(centerId: string, centerToken: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.yalidine.app/v1/wilayas/', {
      headers: {
        'X-API-ID': centerId,
        'X-API-TOKEN': centerToken,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 200) return { ok: true, message: 'Connexion Yalidine réussie !' }
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Identifiants Yalidine invalides' }
    return { ok: false, message: `Erreur Yalidine (status ${res.status})` }
  } catch {
    return { ok: false, message: 'Impossible de contacter Yalidine' }
  }
}

async function testMaystro(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.maystro-delivery.com/auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: apiKey }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 200 || res.status === 201) return { ok: true, message: 'Connexion Maystro réussie !' }
    return { ok: false, message: 'Clé Maystro invalide' }
  } catch {
    return { ok: false, message: 'Impossible de contacter Maystro' }
  }
}
