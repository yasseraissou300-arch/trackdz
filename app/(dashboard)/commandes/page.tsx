'use client'

import { Suspense, useRef } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommandeStatusBadge } from '@/components/commandes/CommandeStatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { STATUT_LABELS, TRANSPORTEUR_LABELS } from '@/types/commande'
import { StatutCommande, Transporteur, WaStatut } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, Plus, RefreshCw, MoreHorizontal, Eye, MessageSquare, Copy, Download, Filter, CloudDownload, CheckCircle2, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Commande {
  id: string; reference: string; trackingNumber: string | null; transporteur: Transporteur
  statut: StatutCommande; clientNom: string; clientTelephone: string; clientWilaya: string
  montant: number | null; dateCreation: string; waMessages: { statut: WaStatut; sentAt: string | null }[]
}
interface PaginationInfo { page: number; limit: number; total: number; pages: number }
interface ImportResult { created: number; skipped: number; errors: number; total: number; error?: string; code?: string }

const STATUTS = Object.entries(STATUT_LABELS) as [StatutCommande, string][]
const TRANSPORTEURS = Object.entries(TRANSPORTEUR_LABELS) as [Transporteur, string][]

function CommandesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCsvInstructions, setShowCsvInstructions] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const statut = searchParams.get('statut') || ''
  const transporteur = searchParams.get('transporteur') || ''

  const fetchCommandes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (search) params.set('search', search)
    if (statut) params.set('statut', statut)
    if (transporteur) params.set('transporteur', transporteur)
    const res = await fetch(`/api/commandes?${params}`)
    const data = await res.json()
    setCommandes(data.commandes || [])
    setPagination(data.pagination || null)
    setLoading(false)
  }, [page, search, statut, transporteur])

  useEffect(() => { fetchCommandes() }, [fetchCommandes])

  async function handleImportApi() {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/commandes/import/zrexpress', { method: 'POST' })
      const data: ImportResult = await res.json()
      setImportResult(data)
      setShowImportDialog(true)
      if (data.code === 'API_FORBIDDEN') setShowCsvInstructions(true)
      if (data.created > 0) fetchCommandes()
    } catch { toast.error('Erreur lors de l\'importation') }
    finally { setImporting(false) }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/commandes/import/csv', { method: 'POST', body: fd })
      const data: ImportResult = await res.json()
      setImportResult(data)
      setShowImportDialog(true)
      setShowCsvInstructions(false)
      if (data.created > 0) { fetchCommandes(); toast.success(`${data.created} commandes importées !`) }
    } catch { toast.error('Erreur lors de l\'importation CSV') }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    params.set('page', '1')
    router.push(`/commandes?${params}`)
  }
  function toggleSelect(id: string) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }
  async function sendWhatsAppBulk() {
    for (const id of selected) await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandeId: id }) })
    toast.success(`${selected.length} messages WhatsApp envoyés`); setSelected([])
  }
  async function copyTracking(t: string) { await navigator.clipboard.writeText(t); toast.success('Numéro de tracking copié') }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCsvUpload} />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{importResult?.error && !showCsvInstructions ? 'Importation impossible' : importResult?.error && showCsvInstructions ? 'Importer via CSV' : 'Résultat de l\'importation ZR Express'}</DialogTitle>
            <DialogDescription>{!importResult?.error ? `${importResult?.total ?? 0} colis traités depuis ZR Express` : ''}</DialogDescription>
          </DialogHeader>

          {importResult?.error && showCsvInstructions ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-sm">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>L\'API ZR Express ne permet pas encore la lecture directe des colis. Exportez votre liste depuis ZR Express puis uploadez le fichier ici.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-sm space-y-2">
                <p className="font-semibold">Comment faire :</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Allez sur <strong>app.zrexpress.app → Commandes</strong></li>
                  <li>Cliquez sur le bouton <strong>▼</strong> à droite de "+ Commande"</li>
                  <li>Sélectionnez <strong>"Exporter"</strong> et téléchargez le fichier</li>
                  <li>Uploadez le fichier ci-dessous</li>
                </ol>
              </div>
              <Button className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Importation...' : 'Choisir le fichier CSV/Excel'}
              </Button>
            </div>
          ) : importResult?.error ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{importResult.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-600">{importResult?.created}</div>
                  <div className="text-xs text-muted-foreground">Importées</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{importResult?.skipped}</div>
                  <div className="text-xs text-muted-foreground">Déjà existantes</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{importResult?.errors}</div>
                  <div className="text-xs text-muted-foreground">Erreurs</div>
                </div>
              </div>
              {(importResult?.created ?? 0) === 0 && (importResult?.total ?? 0) === 0 && (
                <Button variant="outline" className="w-full gap-2" onClick={() => { setShowCsvInstructions(true) }}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Importer via CSV
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Commandes</h1>
          <p className="text-muted-foreground text-sm mt-1">{pagination?.total ?? 0} commandes au total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCommandes}>
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportApi} disabled={importing}
            className="gap-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950">
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            {importing ? 'Importation...' : 'Importer ZR Express'}
          </Button>
          <Button size="sm" asChild>
            <Link href="/commandes/nouveau"><Plus className="h-4 w-4 mr-2" />Nouvelle commande</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, référence, tracking..." className="pl-9" defaultValue={search}
                onChange={(e) => { const v = e.target.value; const t = setTimeout(() => updateFilter('search', v), 400); return () => clearTimeout(t) }} />
            </div>
            <Select value={statut || 'all'} onValueChange={(v) => updateFilter('statut', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{STATUTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={transporteur || 'all'} onValueChange={(v) => updateFilter('transporteur', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Transporteur" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous</SelectItem>{TRANSPORTEURS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Plus de filtres</Button>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Export CSV</Button>
          </div>
          {selected.length > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{selected.length} sélectionné(s)</span>
              <Button size="sm" variant="outline" onClick={sendWhatsAppBulk} className="gap-2"><MessageSquare className="h-4 w-4" />Envoyer WhatsApp</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-4 py-3"><Checkbox checked={selected.length === commandes.length && commandes.length > 0} onCheckedChange={(c) => setSelected(c ? commandes.map(x => x.id) : [])} /></th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Référence</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Transporteur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Wilaya</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Montant</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">WhatsApp</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i) => <tr key={i} className="border-b">{Array.from({length:10}).map((_,j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>)
              : commandes.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Aucune commande trouvée</p></td></tr>
              ) : commandes.map(c => {
                const wa = c.waMessages[0]
                return (
                  <tr key={c.id} className={cn('border-b hover:bg-muted/20 transition-colors', selected.includes(c.id) && 'bg-primary/5')}>
                    <td className="px-4 py-3"><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                    <td className="px-4 py-3"><div className="font-medium font-mono text-xs">{c.reference}</div>{c.trackingNumber && <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.trackingNumber}</div>}</td>
                    <td className="px-4 py-3"><div className="font-medium">{c.clientNom}</div><div className="text-xs text-muted-foreground">{c.clientTelephone}</div></td>
                    <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-md bg-muted">{TRANSPORTEUR_LABELS[c.transporteur]}</span></td>
                    <td className="px-4 py-3"><CommandeStatusBadge statut={c.statut} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.clientWilaya}</td>
                    <td className="px-4 py-3 text-sm font-medium">{c.montant ? `${c.montant.toLocaleString('fr-DZ')} DA` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(c.dateCreation), 'dd MMM', { locale: fr })}</td>
                    <td className="px-4 py-3">{wa ? <span className={cn('text-xs px-2 py-0.5 rounded-full', wa.statut === 'LU' ? 'bg-blue-100 text-blue-700' : wa.statut === 'DELIVRE' ? 'bg-green-100 text-green-700' : wa.statut === 'ENVOYE' ? 'bg-gray-100 text-gray-700' : wa.statut === 'ECHEC' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>{wa.statut === 'LU' ? 'Lu' : wa.statut === 'DELIVRE' ? 'Délivré' : wa.statut === 'ENVOYE' ? 'Envoyé' : wa.statut === 'ECHEC' ? 'Échec' : 'En attente'}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/commandes/${c.id}`}><Eye className="h-4 w-4 mr-2" />Voir détail</Link></DropdownMenuItem><DropdownMenuItem onClick={async () => { await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandeId: c.id }) }); toast.success('Message WhatsApp envoyé') }}><MessageSquare className="h-4 w-4 mr-2" />Envoyer WhatsApp</DropdownMenuItem>{c.trackingNumber && <DropdownMenuItem onClick={() => copyTracking(c.trackingNumber!)}><Copy className="h-4 w-4 mr-2" />Copier tracking</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">{(pagination.page-1)*pagination.limit+1}–{Math.min(pagination.page*pagination.limit, pagination.total)} sur {pagination.total}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={pagination.page<=1} onClick={() => updateFilter('page', String(pagination.page-1))}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={pagination.page>=pagination.pages} onClick={() => updateFilter('page', String(pagination.page+1))}>Suivant</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function CommandesPage() {
  return <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-96 bg-muted rounded" /></div>}><CommandesContent /></Suspense>
}

function Package({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
}