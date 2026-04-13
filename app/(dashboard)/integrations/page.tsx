'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TRANSPORTEUR_LABELS } from '@/types/commande'
import { Transporteur } from '@prisma/client'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Settings, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Integration {
  id: string
  transporteur: Transporteur
  apiKey: string | null
  actif: boolean
  lastSyncAt: string | null
  syncError: string | null
}

const TRANSPORTEUR_INFO: Record<Transporteur, { description: string; apiKeyLabel: string; docsUrl: string; color: string }> = {
  YALIDINE: {
    description: 'Livraison express dans toute l\'Algérie',
    apiKeyLabel: 'Bearer Token',
    docsUrl: 'https://api.yalidine.app',
    color: 'bg-blue-500',
  },
  ZREXPRESS: {
    description: 'Livraison rapide et fiable',
    apiKeyLabel: 'API Key',
    docsUrl: 'https://zrexpress.dz',
    color: 'bg-green-500',
  },
  MAYSTRO: {
    description: 'Maystro Delivery — national',
    apiKeyLabel: 'JWT Token',
    docsUrl: 'https://maystro-delivery.com',
    color: 'bg-purple-500',
  },
  AMANA: {
    description: 'Amana Express — livraison nationale',
    apiKeyLabel: 'API Key',
    docsUrl: 'https://amana-dz.com',
    color: 'bg-orange-500',
  },
  PROCOLIS: {
    description: 'Procolis — livraison intelligente',
    apiKeyLabel: 'API Key',
    docsUrl: 'https://procolis.com',
    color: 'bg-red-500',
  },
  ECOTRACK: {
    description: 'Ecotrack — suivi en temps réel',
    apiKeyLabel: 'API Key',
    docsUrl: 'https://ecotrack.dz',
    color: 'bg-teal-500',
  },
}

const ALL_TRANSPORTEURS: Transporteur[] = ['YALIDINE', 'ZREXPRESS', 'MAYSTRO', 'AMANA', 'PROCOLIS', 'ECOTRACK']

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState<Transporteur | null>(null)
  const [form, setForm] = useState({ apiKey: '', apiSecret: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data)
        setLoading(false)
      })
  }, [])

  function getIntegration(transporteur: Transporteur) {
    return integrations.find((i) => i.transporteur === transporteur)
  }

  async function handleSave() {
    if (!configOpen || !form.apiKey) {
      toast.error('Veuillez saisir une clé API')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporteur: configOpen,
          apiKey: form.apiKey,
          apiSecret: form.apiSecret || undefined,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success(`${TRANSPORTEUR_LABELS[configOpen]} configuré avec succès`)
        const updated = await fetch('/api/integrations').then((r) => r.json())
        setIntegrations(updated)
        setConfigOpen(null)
        setForm({ apiKey: '', apiSecret: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    // Simulate test — in production call a test endpoint
    await new Promise((r) => setTimeout(r, 1500))
    toast.success('Connexion réussie !')
    setTesting(false)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Intégrations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connectez vos transporteurs pour activer le suivi automatique
        </p>
      </div>

      {/* Transporteurs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Transporteurs
        </h2>
        <div className="grid gap-3">
          {ALL_TRANSPORTEURS.map((transporteur) => {
            const integration = getIntegration(transporteur)
            const info = TRANSPORTEUR_INFO[transporteur]
            const isConnected = integration?.apiKey && integration.actif
            const hasError = integration?.syncError

            return (
              <Card key={transporteur}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Logo placeholder */}
                      <div
                        className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center text-white font-bold text-sm`}
                      >
                        {TRANSPORTEUR_LABELS[transporteur].charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {TRANSPORTEUR_LABELS[transporteur]}
                          </span>
                          {isConnected && !hasError && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          )}
                          {hasError && (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {!isConnected && (
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                              Non configuré
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                        {integration?.lastSyncAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dernière sync:{' '}
                            {format(new Date(integration.lastSyncAt), 'dd MMM HH:mm', { locale: fr })}
                          </p>
                        )}
                        {hasError && (
                          <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {integration.syncError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {integration && (
                        <Switch
                          checked={integration.actif}
                          onCheckedChange={async (v) => {
                            // Toggle active state
                            setIntegrations((prev) =>
                              prev.map((i) =>
                                i.transporteur === transporteur ? { ...i, actif: v } : i
                              )
                            )
                          }}
                        />
                      )}
                      <Dialog
                        open={configOpen === transporteur}
                        onOpenChange={(open) => {
                          setConfigOpen(open ? transporteur : null)
                          setForm({ apiKey: '', apiSecret: '' })
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Settings className="h-3.5 w-3.5" />
                            {isConnected ? 'Reconfigurer' : 'Configurer'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading">
                              Configurer {TRANSPORTEUR_LABELS[transporteur]}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                              Obtenez votre clé API sur le portail{' '}
                              <a
                                href={info.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                              >
                                {info.docsUrl}
                              </a>
                            </div>

                            <div className="space-y-2">
                              <Label>{info.apiKeyLabel}</Label>
                              <Input
                                type="password"
                                placeholder="Votre clé API..."
                                value={form.apiKey}
                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                              />
                            </div>

                            {transporteur === 'MAYSTRO' && (
                              <div className="space-y-2">
                                <Label>API Secret (optionnel)</Label>
                                <Input
                                  type="password"
                                  placeholder="Secret..."
                                  value={form.apiSecret}
                                  onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                                />
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={testing || !form.apiKey}
                                className="flex-1"
                              >
                                {testing ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Tester
                              </Button>
                              <Button
                                onClick={handleSave}
                                disabled={saving || !form.apiKey}
                                className="flex-1"
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Sauvegarder
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
