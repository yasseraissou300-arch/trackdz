'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TRANSPORTEUR_LABELS } from '@/types/commande'
import { Transporteur } from '@prisma/client'
import { WILAYA_NAMES } from '@/lib/utils/wilayas'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'

const TRANSPORTEURS = Object.entries(TRANSPORTEUR_LABELS) as [Transporteur, string][]

export default function NouvelleCommandePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    reference: '',
    trackingNumber: '',
    transporteur: '' as Transporteur | '',
    clientNom: '',
    clientTelephone: '',
    clientWilaya: '',
    clientAdresse: '',
    montant: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.transporteur) {
      toast.error('Veuillez choisir un transporteur')
      return
    }
    setSaving(true)
    try {
      const body = {
        reference: form.reference,
        trackingNumber: form.trackingNumber || undefined,
        transporteur: form.transporteur,
        clientNom: form.clientNom,
        clientTelephone: form.clientTelephone,
        clientWilaya: form.clientWilaya,
        clientAdresse: form.clientAdresse || undefined,
        montant: form.montant ? parseFloat(form.montant) : undefined,
        notes: form.notes || undefined,
      }
      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Commande créée avec succès')
        router.push(`/commandes/${data.id}`)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la création')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/commandes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Nouvelle commande</h1>
          <p className="text-muted-foreground text-sm">Créer manuellement une commande</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Commande info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informations commande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Référence commande *</Label>
                <Input
                  placeholder="CMD-2024-001"
                  value={form.reference}
                  onChange={(e) => set('reference', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de tracking</Label>
                <Input
                  placeholder="YLD123456789"
                  value={form.trackingNumber}
                  onChange={(e) => set('trackingNumber', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transporteur *</Label>
                <Select
                  value={form.transporteur}
                  onValueChange={(v) => set('transporteur', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORTEURS.map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant (DA)</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={form.montant}
                  onChange={(e) => set('montant', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informations client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input
                  placeholder="Ahmed Benali"
                  value={form.clientNom}
                  onChange={(e) => set('clientNom', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone *</Label>
                <Input
                  placeholder="0555 123 456"
                  value={form.clientTelephone}
                  onChange={(e) => set('clientTelephone', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wilaya *</Label>
                <Select
                  value={form.clientWilaya}
                  onValueChange={(v) => set('clientWilaya', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une wilaya..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WILAYA_NAMES.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Adresse (optionnel)</Label>
                <Input
                  placeholder="Rue, quartier..."
                  value={form.clientAdresse}
                  onChange={(e) => set('clientAdresse', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes internes (optionnel)</Label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Notes visibles uniquement par vous..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" asChild>
            <Link href="/commandes">Annuler</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer la commande
          </Button>
        </div>
      </form>
    </div>
  )
}
