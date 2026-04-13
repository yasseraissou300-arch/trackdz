import { StatutCommande } from '@prisma/client'
import { TransporteurAdapter, TrackingResult, WebhookEvent } from './index'

const STATUT_MAP: Record<string, StatutCommande> = {
  waiting: 'EN_ATTENTE',
  processing: 'EN_PREPARATION',
  shipped: 'EXPEDIE',
  in_transit: 'EN_TRANSIT',
  out_for_delivery: 'EN_LIVRAISON',
  delivered: 'LIVRE',
  failed_delivery: 'ECHEC_LIVRAISON',
  return_in_progress: 'RETOUR_EN_COURS',
  returned: 'RETOURNE',
  cancelled: 'ANNULE',
}

export class YalidineAdapter implements TransporteurAdapter {
  private baseUrl = 'https://api.yalidine.app/v1'

  async getTracking(trackingNumber: string, apiKey: string): Promise<TrackingResult> {
    const response = await fetch(`${this.baseUrl}/parcels/${trackingNumber}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Yalidine API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const statut = this.parseStatut(data.status || data.statut || 'waiting')

    const historique = (data.history || data.tracking_history || []).map(
      (event: { status?: string; statut?: string; description?: string; commune?: string; wilaya?: string; date?: string; created_at?: string }) => ({
        statut: this.parseStatut(event.status || event.statut || 'waiting'),
        description: event.description || '',
        wilaya: event.commune || event.wilaya,
        dateEvenement: new Date(event.date || event.created_at || Date.now()),
      })
    )

    return {
      statut,
      description: data.last_status_description || data.description || '',
      wilaya: data.wilaya || data.commune,
      dateEvenement: new Date(data.updated_at || data.last_update || Date.now()),
      historique,
    }
  }

  parseStatut(rawStatut: string): StatutCommande {
    return STATUT_MAP[rawStatut.toLowerCase()] || 'EN_ATTENTE'
  }

  parseWebhook(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>
    return {
      trackingNumber: data.tracking_id as string || data.tracking_number as string || '',
      statut: this.parseStatut(data.status as string || 'waiting'),
      description: data.description as string || '',
      wilaya: data.wilaya as string | undefined,
      dateEvenement: new Date(data.event_date as string || Date.now()),
      rawData: data,
    }
  }
}
