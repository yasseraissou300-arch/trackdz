import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">📦</span>
        </div>
        <h1 className="font-heading text-2xl font-bold">Commande introuvable</h1>
        <p className="text-muted-foreground mt-3">
          Le numéro de suivi <strong className="font-mono text-foreground">introuvable</strong> ne correspond à aucune
          commande dans notre système.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Vérifiez le numéro de tracking ou contactez votre vendeur.
        </p>
      </div>
    </div>
  )
}
