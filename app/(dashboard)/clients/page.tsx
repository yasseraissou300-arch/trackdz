'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CommandeStatusBadge } from '@/components/commandes/CommandeStatusBadge'
import { StatutCommande, Transporteur } from '@prisma/client'
import { Search, Users } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TRANSPORTEUR_LABELS } from '@/types/commande'

interface Client {
  clientTelephone: string
  clientNom: string
  clientWilaya: string
  _count: { id: number }
  commandes: {
    id: string
    reference: string
    statut: StatutCommande
    transporteur: Transporteur
    dateCreation: string
    montant: number | null
  }[]
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchClients = useCallback(async () => {
    setLoading(true)
    // Fetch from commandes, group by client phone
    const res = await fetch('/api/commandes?limit=200')
    const data = await res.json()

    // Group commandes by client telephone
    const map = new Map<string, Client>()
    for (const cmd of data.commandes || []) {
      const existing = map.get(cmd.clientTelephone)
      if (existing) {
        existing._count.id++
        existing.commandes.unshift(cmd)
      } else {
        map.set(cmd.clientTelephone, {
          clientTelephone: cmd.clientTelephone,
          clientNom: cmd.clientNom,
          clientWilaya: cmd.clientWilaya,
          _count: { id: 1 },
          commandes: [cmd],
        })
      }
    }
    setClients(Array.from(map.values()))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filtered = clients.filter((c) =>
    search
      ? c.clientNom.toLowerCase().includes(search.toLowerCase()) ||
        c.clientTelephone.includes(search) ||
        c.clientWilaya.toLowerCase().includes(search.toLowerCase())
      : true
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Clients</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Base de données de vos clients
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, téléphone, wilaya..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Téléphone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Wilaya</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Commandes</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dernière commande</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut actuel</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Aucun client trouvé</p>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const lastCmd = client.commandes[0]
                  return (
                    <tr key={client.clientTelephone} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                            {client.clientNom.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{client.clientNom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {client.clientTelephone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {client.clientWilaya}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{client._count.id}</span>
                        <span className="text-xs text-muted-foreground ml-1">commande(s)</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {lastCmd
                          ? format(new Date(lastCmd.dateCreation), 'dd MMM yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {lastCmd ? (
                          <CommandeStatusBadge statut={lastCmd.statut} />
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
