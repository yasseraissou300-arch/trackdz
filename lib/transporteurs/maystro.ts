import { StatutCommande } from '@prisma/client'
import { TransporteurAdapter, TrackingResult, WebhookEvent } from './index'

const STATUT_MAP: Record<string, StatutCommande> = {
  PENDING: 'EN_ATTENTE',
  CONFIRMED: 'CONFIRME',
  PROCESSING: 'EN_PREPARATION',
  SHIPPED: 'EXPEDIE',
  IN_TRANSIT: 'EN_TRANSIT',
  OUT_FOR_DELIVERY: 'EN_LIVRAISON',
  DELIVERED: 'LIVRE',
  DELIVERY_FAILED: 'ECHEC_LIVRAISON',
  RETURN_IN_PROGRESS: 'RETOUR_EN_COURS',
  RETURNED: 'RETOURNE',
  CANCELLED: 'ANNULE',
}

export class MaystroAdapter implements TransporteurAdapter {
  private baseUrl = 'https://api.maystro-delivery.com'

  async getTracking(trackingNumber: string, apiKey: string): Promise<TrackingResult> {
    const response = await fetch(`${this.baseUrl}/orders/${trackingNumber}/tracking`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Maystro API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const statut = this.parseStatut(data.status || 'PENDING')

    return {
      statut,
      description: data.status_description || '',
      wilaya: data.destination_wilaya || data.wilaya,
      dateEvenement: new Date(data.updated_at || Date.now()),
      historique: (data.tracking_history || data.events || []).map((event: { status?: string; description?: string; wilaya?: string; timestamp?: string; created_at?: string }) => ({
        statut: this.parseStatut(event.status || 'PENDING'),
        description: event.description || '',
        wilaya: event.wilaya,
        dateEvenement: new Date(event.timestamp || event.created_at || Date.now()),
      })),
    }
  }

  parseStatut(rawStatut: string): StatutCommande {
    return STATUT_MAP[rawStatut.toUpperCase()] || 'EN_ATTENTE'
  }

  parseWebhook(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>
    return {
      trackingNumber: data.order_reference as string || data.tracking as string || '',
      statut: this.parseStatut(data.status as string || 'PENDING'),
      description: data.message as string || '',
      wilaya: data.wilaya as string | undefined,
      dateEvenement: new Date(data.event_time as string || Date.now()),
      rawData: data,
    }
  }
}
