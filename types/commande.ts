import { StatutCommande, Transporteur, WaStatut } from '@prisma/client'

export { StatutCommande, Transporteur, WaStatut }

export const STATUT_LABELS: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  EN_PREPARATION: 'En préparation',
  EXPEDIE: 'Expédié',
  EN_TRANSIT: 'En transit',
  EN_LIVRAISON: 'En livraison',
  LIVRE: 'Livré',
  ECHEC_LIVRAISON: 'Échec livraison',
  RETOUR_EN_COURS: 'Retour en cours',
  RETOURNE: 'Retourné',
  ANNULE: 'Annulé',
}

export const STATUT_COLORS: Record<StatutCommande, string> = {
  EN_ATTENTE: 'bg-gray-100 text-gray-700',
  CONFIRME: 'bg-blue-100 text-blue-700',
  EN_PREPARATION: 'bg-purple-100 text-purple-700',
  EXPEDIE: 'bg-indigo-100 text-indigo-700',
  EN_TRANSIT: 'bg-yellow-100 text-yellow-700',
  EN_LIVRAISON: 'bg-orange-100 text-orange-700',
  LIVRE: 'bg-green-100 text-green-700',
  ECHEC_LIVRAISON: 'bg-red-100 text-red-700',
  RETOUR_EN_COURS: 'bg-pink-100 text-pink-700',
  RETOURNE: 'bg-rose-100 text-rose-700',
  ANNULE: 'bg-slate-100 text-slate-700',
}

export const TRANSPORTEUR_LABELS: Record<Transporteur, string> = {
  YALIDINE: 'Yalidine',
  ZREXPRESS: 'Zr Express',
  MAYSTRO: 'Maystro',
  AMANA: 'Amana',
  PROCOLIS: 'Procolis',
  ECOTRACK: 'Ecotrack',
}

export const TRANSPORTEUR_COLORS: Record<Transporteur, string> = {
  YALIDINE: 'bg-blue-500',
  ZREXPRESS: 'bg-green-500',
  MAYSTRO: 'bg-purple-500',
  AMANA: 'bg-orange-500',
  PROCOLIS: 'bg-red-500',
  ECOTRACK: 'bg-teal-500',
}

export const WA_STATUT_LABELS: Record<WaStatut, string> = {
  EN_ATTENTE: 'En attente',
  ENVOYE: 'Envoyé',
  DELIVRE: 'Délivré',
  LU: 'Lu',
  ECHEC: 'Échec',
}

export interface CommandeWithRelations {
  id: string
  reference: string
  trackingNumber: string | null
  transporteur: Transporteur
  statut: StatutCommande
  clientNom: string
  clientTelephone: string
  clientWilaya: string
  clientAdresse: string | null
  montant: number | null
  produits: unknown
  notes: string | null
  dateCreation: Date
  dateExpedition: Date | null
  dateLivraison: Date | null
  dateRetour: Date | null
  updatedAt: Date
  waMessages: {
    id: string
    statut: WaStatut
    sentAt: Date | null
    createdAt: Date
  }[]
  historique: {
    id: string
    statut: StatutCommande
    description: string | null
    wilaya: string | null
    createdAt: Date
  }[]
}
