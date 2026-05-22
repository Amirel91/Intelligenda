import { ArrowLeft, FileText } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termini e Condizioni — IntelliGenda',
  description: 'Termini e Condizioni di Servizio della piattaforma IntelliGenda.',
}

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a
            href="/landing"
            className="flex items-center gap-2.5 text-stone-900 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">IntelliGenda</span>
          </a>
          <a
            href="/landing"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Title block */}
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
              Termini e Condizioni di Servizio
            </h1>
            <p className="mt-2 text-sm text-stone-400">
              Ultimo aggiornamento: Maggio 2025
            </p>
          </div>

          {/* Intro */}
          <div className="prose-legal mb-10">
            <p className="text-stone-700 leading-relaxed">
              Benvenuto su IntelliGenda. I presenti Termini e Condizioni disciplinano l&apos;accesso e
              l&apos;utilizzo della piattaforma SaaS &ldquo;IntelliGenda&rdquo; (di seguito &ldquo;il
              Servizio&rdquo;), fornita da IntelliGenda. Registrando un account su IntelliGenda,
              l&apos;utente (di seguito &ldquo;il Cliente&rdquo; o &ldquo;l&apos;Attivit&agrave;&rdquo;)
              accetta integralmente i presenti Termini.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    Oggetto del Servizio
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    IntelliGenda fornisce un software in modalità SaaS (Software as a Service) per la
                    gestione informatizzata degli appuntamenti, dei servizi e dei calendari per
                    attività commerciali e professionisti. Il Servizio viene erogato tramite il dominio
                    principale intelligenda.it e relativi sottodomini dedicati.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    Attivazione e Abbonamento
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    All&apos;atto della registrazione, il Cliente può beneficiare di un periodo di
                    prova gratuito di 14 giorni. Al termine, per mantenere attivo il Servizio, il
                    Cliente è tenuto a sottoscrivere un abbonamento al costo di 40,00 EUR mensili
                    gestito tramite il gateway Nexi (XPay). L&apos;abbonamento si rinnova
                    automaticamente ogni mese.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    Disdetta e Sospensione
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    Il Cliente ha il diritto di annullare l&apos;abbonamento in qualsiasi momento dal
                    pannello &ldquo;Account&rdquo;. Il Servizio rimarrà attivo fino al termine del
                    periodo mensile già pagato. Alla scadenza, se l&apos;abbonamento è disdetto o il
                    pagamento fallisce, il sottodominio verrà impostato come &ldquo;Sospeso&rdquo; e
                    l&apos;accesso all&apos;agenda verrà bloccato dal Middleware.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                  4
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    Responsabilità
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    Il Fornitore eroga il software tramite infrastrutture cloud sicure ma non risponde di
                    interruzioni dovute a terzi o a internet. Il Cliente è l&apos;unico responsabile
                    delle proprie credenziali e dei rapporti commerciali con i suoi clienti finali. Il
                    Fornitore è un mero fornitore di tecnologia e non risponde di appuntamenti persi o
                    no-show.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white text-sm font-bold flex items-center justify-center">
                  5
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    Foro Competente
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è
                    competente in via esclusiva il Foro di Sondrio.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-stone-100">
        <p className="text-xs text-stone-400">
          &copy; {new Date().getFullYear()} IntelliGenda &mdash; Tutti i diritti riservati
        </p>
      </footer>
    </div>
  )
}
