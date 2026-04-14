import { StatutCommande, Transporteur } from '@prisma/client'

export interface TrackingEvent {
  statut: StatutCommande
  description: string
  wilaya?: string
  dateEvenement: Date
}

export interface TrackingResult {
  statut: StatutCommande
  description: string
  wilaya?: string
  dateEvenement: Date
  historique: TrackingEvent[]
}

export interface WebhookEvent {
  trackingNumber: string
  statut: StatutCommande
  description: string
  wilaya?: string
  dateEvenement: Date
  rawData: unknown
}

export interface TransporteurAdapter {
  getTracking(trackingNumber: string, apiKey: string, apiSecret?: string): Promise<TrackingResult>
  parseStatut(rawStatut: string): StatutCommande
  parseWebhook(payload: unknown): WebhookEvent
}

export { YalidineAdapter } from './yalidine'
export { ZrExpressAdapter } from './zrexpress'
export { MaystroAdapter } from './maystro'
export { AmanaAdapter } from './amana'

export function getAdapter(transporteur: Transporteur): new () => TransporteurAdapter {
  const adapters: Record<Transporteur, new () => TransporteurAdapter> = {
    YALIDINE: require('./yalidine').YalidineAdapter,
    ZREXPRESS: require('./zrexpress').ZrExpressAdapter,
    MAYSTRO: require('./maystro').MaystroAdapter,
    AMANA: require('./amana').AmanaAdapter,
    PROCOLIS: require('./yalidine').YalidineAdapter,
    ECOTRACK: require('./yalidine').YalidineAdapter,
  }
  return adapters[transporteur]
}
