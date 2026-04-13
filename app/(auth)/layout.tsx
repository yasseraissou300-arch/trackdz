export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: branding */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold font-heading">T</span>
          </div>
          <span className="font-heading font-bold text-xl">TrackDZ</span>
        </div>

        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Suivez vos commandes.<br />
            Notifiez vos clients.<br />
            Automatiquement.
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            La plateforme de suivi de livraison pour les e-commerçants algériens.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Transporteurs', value: '6+' },
            { label: 'Wilayas couvertes', value: '58' },
            { label: 'Messages envoyés', value: '1M+' },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 rounded-xl p-4">
              <div className="font-heading text-2xl font-bold">{stat.value}</div>
              <div className="text-primary-foreground/70 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground font-heading">T</span>
            </div>
            <span className="font-heading font-bold text-xl">TrackDZ</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
