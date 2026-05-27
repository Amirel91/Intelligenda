'use client'

export default function ManutenzionePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-8 w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1a7 7 0 119.9 0l-5.1 5.1a.5.5 0 01-.7 0zM12 9a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 mb-3">
          IntelliGenda si sta aggiornando.
        </h1>
        <p className="text-stone-500 leading-relaxed mb-8">
          Saremo di nuovo attivi tra pochi minuti.<br />
          Ci scusiamo per il disagio.
        </p>
        <div className="flex items-center justify-center gap-2 text-stone-400">
          <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" />
          <span className="text-sm">Aggiornamento in corso...</span>
        </div>
      </div>
    </div>
  )
}
