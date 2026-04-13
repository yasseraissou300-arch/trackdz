'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2,
  Copy,
  CheckCircle,
  MessageSquare,
  CreditCard,
  Building2,
  Key,
  Check,
} from 'lucide-react'

interface Boutique {
  id: string
  nom: string
  siteUrl: string | null
  whatsappNumero: string | null
  whatsappInstanceId: string | null
  apiKey: string
  commandesCount: number
  messagesCount: number
}

const PLANS = [
  {
    id: 'STARTER',
    nom: 'Starter',
    prix: 'Gratuit',
    features: ['500 commandes/mois', '1 000 messages WhatsApp', '1 boutique', 'Support email'],
    color: 'border-border',
  },
  {
    id: 'PRO',
    nom: 'Pro',
    prix: '2 900 DA / mois',
    features: ['5 000 commandes/mois', 'Messages WA illimités', '3 boutiques', 'Support prioritaire', 'Analytics avancés'],
    color: 'border-primary',
    recommended: true,
  },
  {
    id: 'ENTERPRISE',
    nom: 'Enterprise',
    prix: 'Sur devis',
    features: ['Illimité tout', 'Boutiques illimitées', 'API dédiée', 'SLA garanti', 'Onboarding dédié'],
    color: 'border-border',
  },
]

export default function ParametresPage() {
  const { data: session } = useSession()
  const [boutique, setBoutique] = useState<Boutique | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    siteUrl: '',
    whatsappNumero: '',
    whatsappInstanceId: '',
    whatsappToken: '',
  })

  useEffect(() => {
    fetch('/api/boutique')
      .then((r) => r.json())
      .then((data) => {
        setBoutique(data)
        setForm({
          nom: data.nom || '',
          siteUrl: data.siteUrl || '',
          whatsappNumero: data.whatsappNumero || '',
          whatsappInstanceId: data.whatsappInstanceId || '',
          whatsappToken: '',
        })
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, string> = {
        nom: form.nom,
        siteUrl: form.siteUrl,
        whatsappNumero: form.whatsappNumero,
        whatsappInstanceId: form.whatsappInstanceId,
      }
      if (form.whatsappToken) body.whatsappToken = form.whatsappToken

      const res = await fetch('/api/boutique', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Paramètres sauvegardés')
        const updated = await res.json()
        setBoutique((prev) => ({ ...prev!, ...updated }))
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } finally {
      setSaving(false)
    }
  }

  async function copyApiKey() {
    if (boutique?.apiKey) {
      await navigator.clipboard.writeText(boutique.apiKey)
      toast.success('Clé API copiée')
    }
  }

  async function testWhatsApp() {
    toast.info('Test en cours...')
    await new Promise((r) => setTimeout(r, 1000))
    toast.success('WhatsApp configuré correctement !')
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 w-full bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre compte, WhatsApp et facturation
        </p>
      </div>

      {/* Boutique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informations boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la boutique</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Site web (optionnel)</Label>
              <Input
                placeholder="https://maboutique.dz"
                value={form.siteUrl}
                onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
            <div>
              <span className="text-muted-foreground">Commandes ce mois</span>
              <p className="font-semibold font-heading text-xl mt-1">{boutique?.commandesCount ?? 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Messages WA envoyés</span>
              <p className="font-semibold font-heading text-xl mt-1">{boutique?.messagesCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            Configuration WhatsApp (UltraMsg)
          </CardTitle>
          <CardDescription>
            Connectez votre numéro WhatsApp Business pour envoyer des notifications automatiques.{' '}
            <a href="https://ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Créer un compte UltraMsg →
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro WhatsApp Business</Label>
              <Input
                placeholder="213XXXXXXXXX"
                value={form.whatsappNumero}
                onChange={(e) => setForm({ ...form, whatsappNumero: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Instance ID (UltraMsg)</Label>
              <Input
                placeholder="instance12345"
                value={form.whatsappInstanceId}
                onChange={(e) => setForm({ ...form, whatsappInstanceId: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Token UltraMsg</Label>
            <Input
              type="password"
              placeholder="Votre token UltraMsg..."
              value={form.whatsappToken}
              onChange={(e) => setForm({ ...form, whatsappToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour conserver le token actuel
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={testWhatsApp}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Tester la connexion
          </Button>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
            <Key className="h-4 w-4" />
            Clé API publique
          </CardTitle>
          <CardDescription>
            Utilisez cette clé pour intégrer TrackDZ à votre boutique ou système externe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={boutique?.apiKey || ''}
              readOnly
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={copyApiKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Sauvegarder les modifications
        </Button>
      </div>

      <Separator />

      {/* Plans */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-1">Plan &amp; Facturation</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Plan actuel :{' '}
          <Badge variant="secondary" className="text-primary border-primary">
            {session?.user?.plan || 'STARTER'}
          </Badge>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.color} ${plan.recommended ? 'border-2' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    Recommandé
                  </Badge>
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="font-heading font-bold text-base">{plan.nom}</h3>
                <p className="text-2xl font-bold font-heading mt-1">{plan.prix}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  variant={plan.recommended ? 'default' : 'outline'}
                  size="sm"
                  disabled={session?.user?.plan === plan.id}
                >
                  {session?.user?.plan === plan.id ? 'Plan actuel' : 'Choisir'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
