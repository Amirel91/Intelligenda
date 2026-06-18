"""
Surgical translation script: wraps Italian strings in prenota/page.tsx with t() calls.
Only adds the import and wraps strings — does NOT change any logic/structure.
"""
import re

filepath = '/home/z/my-project/src/app/prenota/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import after the usePWAInstall import
content = content.replace(
    "import { usePWAInstall } from '@/hooks/use-pwa-install'",
    "import { usePWAInstall } from '@/hooks/use-pwa-install'\nimport { useT, EN_MONTHS, EN_DAYS } from '@/lib/tenant-i18n'"
)

# 2. Make month/day arrays locale-aware
content = content.replace(
    "['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']",
    "t('Orari') === 'Hours' ? EN_MONTHS : ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']"
)
content = content.replace(
    "['Lu','Ma','Me','Gi','Ve','Sa','Do']",
    "t('Orari') === 'Hours' ? EN_DAYS : ['Lu','Ma','Me','Gi','Ve','Sa','Do']"
)

# 3. Add const t = useT() inside the component
content = content.replace(
    "const [booking, setBooking] = useState<BookingState>",
    "const t = useT()\n  const [booking, setBooking] = useState<BookingState>"
)

# 4. Simple JSX text replacements: >Italian< -> >{t('Italian')}<
simple = [
    'Scegli i servizi',
    'Seleziona uno o piu servizi per il tuo appuntamento',
    'Altri servizi',
    'Servizi selezionati',
    'Totale',
    'Scegli un operatore',
    'Caricamento operatori disponibili...',
    'Scegli data e ora',
    'Disponibile',
    'Pochi posti',
    'Completo',
    'Caricamento orari...',
    'Nessun orario disponibile per questa data',
    'Riepilogo',
    'Durata',
    'Sconto',
    'Totale scontato',
    'I tuoi dati',
    'Prenotazione confermata!',
    'Grazie, ti aspettiamo!',
    'Cliente',
    'Sconto applicato',
    'Aggiungi al Calendario',
    'Annulla questa prenotazione',
    'Torna alla Home',
    'Prenotazione in corso...',
    'Continua',
    'Errore nella prenotazione',
    'Qualsiasi operatore disponibile',
    'Verra assegnato il primo operatore libero',
    'Assegnazione automatica al primo operatore disponibile',
    'Chiuso',
    'oppure',
    'Hai gia un account?',
    'Accedi per gestire le tue prenotazioni.',
    'Applica',
    'Installa IntelliGenda',
    'Tocca il pulsante Condividi in basso',
    'Seleziona Aggiungi a Home',
    'Conferma con Aggiungi',
    'Conferma la tua prenotazione',
    'Inserisci i tuoi dati per confermare la prenotazione',
    'Convalidiamo la tua prenotazione utilizzando i dati del tuo profilo.',
    'Completa i dati qui sotto per confermare la prenotazione.',
    'Ricordami per la prossima prenotazione',
    'Voglio registrarmi per salvare i miei dati',
    'Nome *',
    'Cognome *',
    'Telefono *',
    'Email',
    'Crea Password *',
    'Conferma Password *',
    'Prenota',
    'Hai un codice sconto?',
    '(opzionale)',
    'Prenotazioni gestite da',
]

for s in simple:
    escaped = re.escape(s)
    # Match >text< with possible whitespace
    pattern = f'>(\\s*){escaped}(\\s*)<'
    replacement = f'>\\1{{t(\'{s}\')}}\\2<'
    content = re.sub(pattern, replacement, content)

# 5. Placeholder attributes
content = content.replace(
    'placeholder="Cerca un servizio..."',
    "placeholder={t('Cerca un servizio...')}"
)
content = content.replace(
    'placeholder="SCONTO10"',
    "placeholder={t('SCONTO10')}"
)
content = content.replace(
    'placeholder="Mario"',
    "placeholder={t('Mario')}"
)
content = content.replace(
    'placeholder="Rossi"',
    "placeholder={t('Rossi')}"
)
content = content.replace(
    'placeholder="Almeno 6 caratteri"',
    "placeholder={t('Almeno 6 caratteri')}"
)
content = content.replace(
    'placeholder="Ripeti la password"',
    "placeholder={t('Ripeti la password')}"
)
content = content.replace(
    'placeholder="+39 333 1234567"',
    'placeholder="+1 555 1234567"'
)
content = content.replace(
    'placeholder="mario@email.com"',
    'placeholder="name@email.com"'
)

# 6. "Seleziona chi ti assistera..."
content = content.replace(
    '>Seleziona chi ti assistera, oppure scegli il primo disponibile<',
    ">{t('Seleziona chi ti assistera, oppure scegli il primo disponibile')}<"
)

# 7. Count labels: "X servizi"
content = content.replace(
    "{items.length} servizi",
    "{items.length} {t('servizi')}"
)
content = content.replace(
    "{uncategorized.length} servizi",
    "{uncategorized.length} {t('servizi')}"
)

# 8. Singular/plural: "X servizio" / "X servizi"
content = content.replace(
    "{booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''}",
    "{booking.serviceIds.length} {t('servizio')}{booking.serviceIds.length > 1 ? (t('servizi') !== 'services' ? 'i' : 's') : ''}"
)

# 9. Cleanup note
content = content.replace(
    "incl. {totalCleanupInList} min di pulizia/organizzazione",
    "t('incl. {n} min di pulizia/organizzazione').replace('{n}', String(totalCleanupInList))"
)

# 10. "+ X min pulizia" in summary
content = content.replace(
    "+ {totalCleanup} min pulizia",
    "t('+ {n} min pulizia').replace('{n}', String(totalCleanup))"
)

# 11. Conditional "Totale scontato" / "Totale"
content = content.replace(
    "couponDiscount > 0 ? 'Totale scontato' : 'Totale'",
    "couponDiscount > 0 ? t('Totale scontato') : t('Totale')"
)

# 12. "-€X applicato"
content = content.replace(
    "-\u20AC{couponDiscount.toFixed(2)} applicato",
    "t('-\u20AC{n} applicato').replace('{n}', couponDiscount.toFixed(2))"
)

# 13. Dynamic strings with {name}
content = content.replace(
    "Verrai affidato a {selectedOperator.name}",
    "t('Verrai affidato a {name}').replace('{name}', selectedOperator.name)"
)
content = content.replace(
    "Bentornato, {customer.nome}!",
    "t('Bentornato, {name}!').replace('{name}', customer.nome)"
)
content = content.replace(
    "Account connesso \u2014 {customer.email}",
    "t('Account connesso \u2014 {email}').replace('{email}', customer.email)"
)

# 14. Validation error strings
validation_errors = [
    "Nome obbligatorio",
    "Telefono obbligatorio",
    "Telefono non valido",
    "Email non valida",
    "Email obbligatoria per la registrazione",
    "La password deve avere almeno 6 caratteri",
    "Le password non coincidono",
    "Codice non valido",
    "Errore nella verifica",
]
for v in validation_errors:
    content = content.replace(f"'{v}'", f"t('{v}')")

# 15. Step indicator labels
content = content.replace("label: 'Servizi'", "label: t('Servizi')")
content = content.replace("label: 'Operatore'", "label: t('Operatore')")
content = content.replace("label: 'Data'", "label: t('Data')")
content = content.replace("label: 'Dati'", "label: t('Dati')")

# 16. Submit buttons (these are in variables/conditions)
content = content.replace("'Conferma e Prenota'", "t('Conferma e Prenota')")
content = content.replace("'Finalizza Prenotazione'", "t('Finalizza Prenotazione')")
content = content.replace("'Errore nella prenotazione'", "t('Errore nella prenotazione')")

# 17. Google Calendar strings
content = content.replace("'Appuntamento'", "t('Appuntamento')")
content = content.replace(
    "'Operatore: ' + (selectedOperator?.name || '')",
    "t('Operatore: {name}').replace('{name}', selectedOperator?.name || '')"
)
content = content.replace(
    "'Prenotazione confermata per ' + selectedServiceNames",
    "t('Prenotazione confermata per {services}').replace('{services}', selectedServiceNames)"
)
content = content.replace(
    "'Totale: \u20AC' + totalPrice.toFixed(2)",
    "t('Totale: \u20AC{n}').replace('{n}', totalPrice.toFixed(2))"
)
content = content.replace(
    "'Durata: ' + formatDuration(totalDuration)",
    "t('Durata: {n}').replace('{n}', formatDuration(totalDuration))"
)

# 18. "Orari disponibili per {date}"
content = content.replace(
    "'Orari disponibili per ' + formatDate(displayDate)",
    "t('Orari disponibili per {date}').replace('{date}', formatDate(displayDate))"
)

# 19. PWA install prompts (with quotes)
content = content.replace(
    "\"Scarica l'app sul tuo telefono\"",
    "t(\"Scarica l'app sul tuo telefono\")"
)
content = content.replace(
    "\"Scarica l'app per le prossime prenotazioni\"",
    "t(\"Scarica l'app per le prossime prenotazioni\")"
)

# 20. "Crea un account per gestire..." (long text)
content = content.replace(
    ">Crea un account per gestire le tue prenotazioni in futuro. Ti invieremo i dati di accesso via email.<",
    ">{t('Crea un account per gestire le tue prenotazioni in futuro. Ti invieremo i dati di accesso via email.')}<"
)

# 21. Handle the "Nessun servizio trovato" with search query (contains HTML entities)
content = content.replace(
    "Nessun servizio trovato per &ldquo;{searchQuery.trim()}&rdquo;",
    "t('Nessun servizio trovato per \"{searchQuery}\"').replace('{searchQuery}', searchQuery.trim())"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! All replacements applied to prenota/page.tsx")