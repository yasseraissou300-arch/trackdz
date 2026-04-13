import { StatutCommande } from '@prisma/client'
import { TransporteurAdapter, TrackingResult, WebhookEvent } from './index'

const STATUT_MAP: Record<string, StatutCommande> = {
  '0': 'EN_ATTENTE',
  '1': 'CONFIRME',
  '2': 'EN_PREPARATION',
  '3': 'EXPEDIE',
  '4': 'EN_TRANSIT',
  '5': 'EN_LIVRAISON',
  '6': 'LIVRE',
  '7': 'ECHEC_LIVRAISON',
  '8': 'RETOUR_EN_COURS',
  '9': 'RETOURNE',
  '10': 'ANNULE',
}

export class AmanaAdapter implements TransporteurAdapter {
  private baseUrl = 'https://api.amana-dz.com/v2'

  async getTracking(trackingNumber: string, apiKey: string): Promise<TrackingResult> {
    const response = await fetch(`${this.baseUrl}/track`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracking_number: trackingNumber }),
    })

    if (!response.ok) {
      throw new Error(`Amana API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const statusCode = String(data.status_code || data.status || '0')
    const statut = this.parseStatut(statusCode)

    return {
      statut,
      description: data.status_label || data.description || '',
      wilaya: data.wilaya || data.destination,
      dateEvenement: new Date(data.last_update || Date.now()),
      historique: (data.history || data.events || []).map((event: { status_code?: string | number; status?: string; label?: string; description?: string; wilaya?: string; date?: string }) => ({
        statut: this.parseStatut(String(event.status_code || event.status || '0')),
        description: event.label || event.description || '',
        wilaya: event.wilaya,
        dateEvenement: new Date(event.date || Date.now()),
      })),
    }
  }

  parseStatut(rawStatut: string): StatutCommande {
    return STATUT_MAP[rawStatut] || 'EN_ATTENTE'
  }

  parseWebhook(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>
    return {
      trackingNumber: data.tracking_number as string || '',
      statut: this.parseStatut(String(data.status_code || data.status || '0')),
      description: data.description as string || '',
      wilaya: data.wilaya as string | undefined,
      dateEvenement: new Date(data.event_date as string || Date.now()),
      rawData: data,
    }
  }
}
