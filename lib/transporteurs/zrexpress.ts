import { StatutCommande } from '@prisma/client'
import { TransporteurAdapter, TrackingResult, WebhookEvent } from './index'

// ZR Express state name -> TrackDZ status
const STATUT_MAP: Record<string, StatutCommande> = {
  // French
  'en attente': 'EN_ATTENTE',
  'confirmé': 'CONFIRME',
  'confirmed': 'CONFIRME',
  'en préparation': 'EN_PREPARATION',
  'en preparation': 'EN_PREPARATION',
  'expédié': 'EXPEDIE',
  'expedié': 'EXPEDIE',
  'en transit': 'EN_TRANSIT',
  'en cours de livraison': 'EN_LIVRAISON',
  'en livraison': 'EN_LIVRAISON',
  'livré': 'LIVRE',
  'livre': 'LIVRE',
  'delivered': 'LIVRE',
  'echec livraison': 'ECHEC_LIVRAISON',
  'échec livraison': 'ECHEC_LIVRAISON',
  'echec de livraison': 'ECHEC_LIVRAISON',
  'failed delivery': 'ECHEC_LIVRAISON',
  'retour en cours': 'RETOUR_EN_COURS',
  'retourné': 'RETOURNE',
  'retourne': 'RETOURNE',
  'returned': 'RETOURNE',
  'annulé': 'ANNULE',
  'annule': 'ANNULE',
  'cancelled': 'ANNULE',
  'canceled': 'ANNULE',
}

export class ZrExpressAdapter implements TransporteurAdapter {
  private baseUrl = 'https://api.zrexpress.app'

  async getTracking(trackingNumber: string, apiKey: string, tenantId?: string): Promise<TrackingResult> {
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      'Accept': 'application/json',
    }
    if (tenantId) {
      headers['X-TenantId'] = tenantId
    }

    const response = await fetch(`${this.baseUrl}/api/v1/parcels/${trackingNumber}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`ZR Express API error: ${response.status}`)
    }

    const data = await response.json()

    // state is an object: { id, name, ... }
    const stateName = data.state?.name || data.state?.description || ''
    const statut = this.parseStatut(stateName)

    // Fetch state history for historique
    let historique: TrackingResult['historique'] = []
    try {
      const histRes = await fetch(`${this.baseUrl}/api/v1/parcels/${data.id}/state-history`, {
        headers,
        signal: AbortSignal.timeout(8000),
      })
      if (histRes.ok) {
        const histData = await histRes.json()
        const items = Array.isArray(histData) ? histData : (histData.items || histData.data || [])
        historique = items.map((h: { newState?: { name?: string }; createdAt?: string; comment?: string }) => ({
          statut: this.parseStatut(h.newState?.name || ''),
          description: h.comment || h.newState?.name || '',
          wilaya: undefined,
          dateEvenement: new Date(h.createdAt || Date.now()),
        }))
      }
    } catch {
      // history is optional - ignore errors
    }

    return {
      statut,
      description: stateName,
      wilaya: data.deliveryAddress?.city || data.deliveryAddress?.district,
      dateEvenement: new Date(data.lastStateUpdateAt || data.createdAt || Date.now()),
      historique,
    }
  }

  parseStatut(rawStatut: string): StatutCommande {
    const normalized = rawStatut.toLowerCase().trim()
    return STATUT_MAP[normalized] || 'EN_ATTENTE'
  }

  parseWebhook(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>
    const state = data.state as Record<string, unknown> | undefined
    const stateName = (state?.name as string) || (data.stateName as string) || ''
    return {
      trackingNumber: (data.trackingNumber as string) || (data.tracking as string) || '',
      statut: this.parseStatut(stateName),
      description: stateName,
      wilaya: undefined,
      dateEvenement: new Date((data.lastStateUpdateAt as string) || Date.now()),
      rawData: data,
    }
  }
}
