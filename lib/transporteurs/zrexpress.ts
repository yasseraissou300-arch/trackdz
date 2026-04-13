import { StatutCommande } from '@prisma/client'
import { TransporteurAdapter, TrackingResult, WebhookEvent } from './index'

const STATUT_MAP: Record<string, StatutCommande> = {
  'en attente': 'EN_ATTENTE',
  'confirmé': 'CONFIRME',
  'en preparation': 'EN_PREPARATION',
  'expédié': 'EXPEDIE',
  'en transit': 'EN_TRANSIT',
  'en livraison': 'EN_LIVRAISON',
  'livré': 'LIVRE',
  'echec livraison': 'ECHEC_LIVRAISON',
  'retour en cours': 'RETOUR_EN_COURS',
  'retourné': 'RETOURNE',
  'annulé': 'ANNULE',
}

export class ZrExpressAdapter implements TransporteurAdapter {
  private baseUrl = 'https://zrexpress.dz/api'

  async getTracking(trackingNumber: string, apiKey: string): Promise<TrackingResult> {
    const response = await fetch(`${this.baseUrl}/tracking/${trackingNumber}`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`ZR Express API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const statut = this.parseStatut(data.status || data.statut || 'en attente')

    return {
      statut,
      description: data.description || data.last_status || '',
      wilaya: data.wilaya || data.destination,
      dateEvenement: new Date(data.updated_at || Date.now()),
      historique: (data.history || []).map((event: { status?: string; statut?: string; description?: string; wilaya?: string; date?: string }) => ({
        statut: this.parseStatut(event.status || event.statut || 'en attente'),
        description: event.description || '',
        wilaya: event.wilaya,
        dateEvenement: new Date(event.date || Date.now()),
      })),
    }
  }

  parseStatut(rawStatut: string): StatutCommande {
    const normalized = rawStatut.toLowerCase().trim()
    return STATUT_MAP[normalized] || 'EN_ATTENTE'
  }

  parseWebhook(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>
    return {
      trackingNumber: data.tracking as string || '',
      statut: this.parseStatut(data.status as string || 'en attente'),
      description: data.description as string || '',
      wilaya: data.wilaya as string | undefined,
      dateEvenement: new Date(data.date as string || Date.now()),
      rawData: data,
    }
  }
}
