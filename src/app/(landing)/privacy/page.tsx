import { ArrowLeft, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — IntelliGenda',
  description: 'Informativa sulla Privacy e trattamento dei dati personali — IntelliGenda. Conformità GDPR.',
}

export default function PrivacyPage() {
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
              <ShieldCheck className="w-4 h-4 text-white" />
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
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-stone-400">
              Ultimo aggiornamento: Maggio 2025 &mdash; Conformit&agrave; GDPR (Regolamento UE 679/2016)
            </p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <p className="text-stone-700 leading-relaxed">
              La presente Privacy Policy descrive le modalità di gestione dei dati personali raccolti da
              IntelliGenda in conformità al Regolamento Europeo della Protezione dei Dati (GDPR n.
              679/2016).
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
                    Titolare del Trattamento
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    Il Titolare del Trattamento è il gestore della piattaforma IntelliGenda. Email di
                    contatto reperibile sul sito principale.
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
                    Tipologia di Dati Raccolti
                  </h2>
                  <div className="text-stone-600 leading-relaxed text-sm space-y-4">
                    <div>
                      <h3 className="font-semibold text-stone-800 mb-1">
                        Dati dei Commercianti
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-stone-600">
                        <li>Nome, Cognome, Nome attivit&agrave;, Email, Password cifrata</li>
                        <li>
                          Dati di fatturazione gestiti in modo cifrato e sicuro dai server di Nexi
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800 mb-1">
                        Dati degli Utenti Finali (Clienti dei negozi)
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-stone-600">
                        <li>Nome, Cognome, Numero di telefono e Email (facoltativa)</li>
                      </ul>
                      <p className="mt-2 text-stone-500">
                        Per questi dati il Commerciante agisce come Titolare del Trattamento, mentre
                        IntelliGenda agisce come Responsabile Esterno (Data Processor) limitandosi alla
                        memorizzazione sicura nel database.
                      </p>
                    </div>
                  </div>
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
                    Finalit&agrave; e Base Giuridica
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    I dati sono trattati per consentire la creazione dell&apos;account, gestire la
                    fatturazione e i rinnovi tramite Nexi, consentire le prenotazioni e raccogliere i
                    feedback anti-churn anonimi alla disdetta. La base giuridica è l&apos;esecuzione di
                    un contratto di cui l&apos;utente è parte.
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
                    Conservazione e Sicurezza
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    Tutti i dati sono salvati all&apos;interno dell&apos;Unione Europea su database
                    protetti con sistemi di crittografia avanzata e isolamento dei dati per singolo
                    tenant (Row-Level Security), impedendo accessi non autorizzati.
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
                    Diritti dell&apos;Interessato
                  </h2>
                  <p className="text-stone-600 leading-relaxed text-sm">
                    Gli utenti possono esercitare in ogni momento i diritti previsti dal GDPR (accesso,
                    modifica, portabilit&agrave; o cancellazione dei dati) scrivendo all&apos;indirizzo
                    email del Titolare.
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
