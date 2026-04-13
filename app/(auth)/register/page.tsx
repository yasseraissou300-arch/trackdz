'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    boutiqueName: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création du compte')
        return
      }

      toast.success('Compte créé avec succès ! Connectez-vous.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Créer votre compte</h2>
        <p className="text-muted-foreground mt-1">
          Commencez gratuitement. Aucune carte de crédit requise.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              placeholder="Ahmed Benali"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boutiqueName">Nom de boutique</Label>
            <Input
              id="boutiqueName"
              placeholder="Ma Boutique DZ"
              value={form.boutiqueName}
              onChange={(e) => setForm({ ...form, boutiqueName: e.target.value })}
              required
              minLength={2}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            type="email"
            placeholder="ahmed@maboutique.dz"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 caractères"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer mon compte gratuit
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        En créant un compte, vous acceptez nos{' '}
        <Link href="/cgu" className="underline hover:text-primary">
          Conditions d&apos;utilisation
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
