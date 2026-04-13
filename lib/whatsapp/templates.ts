import { StatutCommande } from '@prisma/client'

export interface TemplateVariables {
  prenom: string
  nom_complet: string
  num_commande: string
  tracking: string
  transporteur: string
  wilaya: string
  montant: string
  lien_suivi: string
}

export function renderTemplate(contenu: string, vars: Partial<TemplateVariables>): string {
  let rendered = contenu
  const replacements: Record<string, string> = {
    '{{prénom}}': vars.prenom || '',
    '{{prenom}}': vars.prenom || '',
    '{{nom_complet}}': vars.nom_complet || '',
    '{{num_commande}}': vars.num_commande || '',
    '{{tracking}}': vars.tracking || '',
    '{{transporteur}}': vars.transporteur || '',
    '{{wilaya}}': vars.wilaya || '',
    '{{montant}}': vars.montant || '',
    '{{lien_suivi}}': vars.lien_suivi || '',
  }

  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  return rendered
}

export const DEFAULT_TEMPLATES: Record<string, { nom: string; declencheur: StatutCommande; contenu: string }> = {
  EXPEDIE: {
    nom: 'Commande expédiée',
    declencheur: 'EXPEDIE',
    contenu: `Bonjour {{prénom}} 👋
Votre commande {{num_commande}} a été expédiée !
🚚 Transporteur : {{transporteur}}
📦 Tracking : {{tracking}}
Livraison prévue dans 24-72h en wilaya {{wilaya}}.
Suivez votre colis : {{lien_suivi}}`,
  },
  EN_TRANSIT: {
    nom: 'Colis en transit',
    declencheur: 'EN_TRANSIT',
    contenu: `📍 Mise à jour — Commande {{num_commande}}
Votre colis est en transit vers {{wilaya}}.
🚚 {{transporteur}} l'achemine vers vous.`,
  },
  EN_LIVRAISON: {
    nom: 'En cours de livraison',
    declencheur: 'EN_LIVRAISON',
    contenu: `🔔 Votre colis est en cours de livraison aujourd'hui !
Le livreur passera chez vous pour la commande {{num_commande}}.
Restez disponible. En cas d'absence, recontactez {{transporteur}}.`,
  },
  LIVRE: {
    nom: 'Commande livrée',
    declencheur: 'LIVRE',
    contenu: `✅ Commande {{num_commande}} livrée avec succès !
Merci pour votre confiance. 🎉
Avez-vous bien reçu votre commande ? Répondez OUI ou NON.`,
  },
  ECHEC_LIVRAISON: {
    nom: 'Échec de livraison',
    declencheur: 'ECHEC_LIVRAISON',
    contenu: `⚠️ Tentative de livraison échouée — Commande {{num_commande}}
Le livreur n'a pas pu vous joindre.
📞 Contactez {{transporteur}} pour reprogrammer.`,
  },
  RETOUR_EN_COURS: {
    nom: 'Retour en cours',
    declencheur: 'RETOUR_EN_COURS',
    contenu: `🔄 Votre commande {{num_commande}} est en cours de retour.
Pour toute question, contactez-nous.`,
  },
}

export const TEMPLATE_VARIABLES = [
  { key: '{{prénom}}', label: 'Prénom du client' },
  { key: '{{nom_complet}}', label: 'Nom complet' },
  { key: '{{num_commande}}', label: 'Référence commande' },
  { key: '{{tracking}}', label: 'Numéro tracking' },
  { key: '{{transporteur}}', label: 'Nom transporteur' },
  { key: '{{wilaya}}', label: 'Wilaya de livraison' },
  { key: '{{montant}}', label: 'Montant commande' },
  { key: '{{lien_suivi}}', label: 'Lien de suivi' },
]
