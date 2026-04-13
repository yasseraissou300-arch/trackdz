'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { STATUT_LABELS, STATUT_COLORS } from '@/types/commande'
import { StatutCommande } from '@prisma/client'
import { TEMPLATE_VARIABLES, renderTemplate } from '@/lib/whatsapp/templates'
import { toast } from 'sonner'
import { Plus, Edit2, MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaTemplate {
  id: string
  nom: string
  declencheur: StatutCommande
  contenu: string
  actif: boolean
  sentCount: number
}

const STATUTS = Object.entries(STATUT_LABELS) as [StatutCommande, string][]

const PREVIEW_VARS = {
  prenom: 'Ahmed',
  nom_complet: 'Ahmed Benali',
  num_commande: 'CMD-2024-001',
  tracking: 'YLD123456789',
  transporteur: 'Yalidine',
  wilaya: 'Alger',
  montant: '5 500 DA',
  lien_suivi: 'https://trackdz.com/suivi/YLD123456789',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    declencheur: 'EXPEDIE' as StatutCommande,
    contenu: '',
    actif: true,
  })

  useEffect(() => {
    fetch('/api/whatsapp/templates')
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data)
        setLoading(false)
      })
  }, [])

  function openEdit(tmpl?: WaTemplate) {
    if (tmpl) {
      setForm({ nom: tmpl.nom, declencheur: tmpl.declencheur, contenu: tmpl.contenu, actif: tmpl.actif })
    } else {
      setForm({ nom: '', declencheur: 'EXPEDIE', contenu: '', actif: true })
    }
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const saved = await res.json()
        setTemplates((prev) => {
          const idx = prev.findIndex((t) => t.declencheur === saved.declencheur)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = saved
            return updated
          }
          return [...prev, saved]
        })
        toast.success('Template sauvegardé')
        setEditOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(tmpl: WaTemplate) {
    const res = await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tmpl, actif: !tmpl.actif }),
    })
    if (res.ok) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === tmpl.id ? { ...t, actif: !t.actif } : t))
      )
    }
  }

  function insertVariable(key: string) {
    setForm((prev) => ({ ...prev, contenu: prev.contenu + key }))
  }

  const preview = renderTemplate(form.contenu, PREVIEW_VARS)

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Templates WhatsApp</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Messages automatiques envoyés à chaque changement de statut
          </p>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openEdit()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-heading">Éditeur de template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 mt-2">
              {/* Editor */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du template</Label>
                  <Input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Ex: Commande expédiée"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Déclencheur (statut)</Label>
                  <Select
                    value={form.declencheur}
                    onValueChange={(v) => setForm({ ...form, declencheur: v as StatutCommande })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS.map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <textarea
                    className="w-full min-h-32 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.contenu}
                    onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                    placeholder="Bonjour {{prénom}} ..."
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Insérer une variable
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono"
                        title={v.label}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.actif}
                    onCheckedChange={(v) => setForm({ ...form, actif: v })}
                  />
                  <Label>Template actif</Label>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sauvegarder
                </Button>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Prévisualisation (données fictives)
                </Label>
                <div className="bg-[#e5ddd5] dark:bg-[#1a1a2e] rounded-xl p-4 min-h-48">
                  <div className="bg-white dark:bg-gray-800 rounded-xl rounded-tl-none px-4 py-3 max-w-xs shadow-sm">
                    <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed">
                      {preview || (
                        <span className="text-muted-foreground italic">
                          Tapez votre message...
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-right text-gray-400 mt-1">12:34 ✓✓</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates list */}
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Aucun template configuré</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((tmpl) => (
            <Card key={tmpl.id} className={cn(!tmpl.actif && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{tmpl.nom}</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          STATUT_COLORS[tmpl.declencheur]
                        )}
                      >
                        {STATUT_LABELS[tmpl.declencheur]}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {tmpl.sentCount} envois
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tmpl.contenu}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={tmpl.actif}
                      onCheckedChange={() => toggleActive(tmpl)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(tmpl)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
