/**
 * Tenant-specific i18n for customer-facing pages.
 *
 * Currently only "marualisa" is translated to English.
 * Every other tenant returns the original Italian string unchanged.
 *
 * Usage in components:
 *   import { useT } from '@/lib/tenant-i18n'
 *   const t = useT()
 *   <h1>{t('Prenota un appuntamento')}</h1>
 */

// ==================== TRANSLATION MAP ====================

const EN: Record<string, string> = {
  // --- page.tsx (tenant home) ---
  'Caricamento...': 'Loading...',
  'Negozio non trovato': 'Store not found',
  'Questo negozio non è al momento disponibile o non esiste.': 'This store is currently unavailable or does not exist.',
  'Torna su IntelliGenda': 'Back to IntelliGenda',
  'Prenota un appuntamento': 'Book an appointment',
  'In evidenza': 'Featured',
  'Orari': 'Hours',
  'Chiuso': 'Closed',
  'Prenotazioni gestite da': 'Bookings powered by',

  // --- CustomerNavbar.tsx ---
  'Menu utente': 'User menu',
  'Profilo': 'Profile',
  'Prenota un appuntamento\n': 'Book an appointment\n', // not needed, handled above
  'I miei appuntamenti': 'My appointments',
  'Disconnettiti': 'Log out',
  'Accedi': 'Log in',
  'Registrati': 'Sign up',

  // --- prenota/page.tsx ---
  // Steps
  'Servizi': 'Services',
  'Operatore': 'Staff',
  'Data': 'Date',
  'Dati': 'Details',

  // Step 1 — Services
  'Scegli i servizi': 'Choose services',
  'Seleziona uno o piu servizi per il tuo appuntamento': 'Select one or more services for your appointment',
  'Cerca un servizio...': 'Search a service...',
  'Altri servizi': 'Other services',
  'Servizi selezionati': 'Selected services',
  'servizio': 'service',
  'servizi': 'services',
  'incl. {n} min di pulizia/organizzazione': 'incl. {n} min cleanup/setup',
  'Totale': 'Total',

  // Step 2 — Operator
  'Scegli un operatore': 'Choose a staff member',
  'Caricamento operatori disponibili...': 'Loading available staff...',
  'Seleziona chi ti assistera, oppure scegli il primo disponibile': 'Choose who will assist you, or pick the first available',
  'Qualsiasi operatore disponibile': 'Any available staff',
  'Verra assegnato il primo operatore libero': 'The first available staff member will be assigned',
  'Verrai affidato a {name}': 'You will be assigned to {name}',
  'Assegnazione automatica al primo operatore disponibile': 'Automatic assignment to the first available staff',

  // Step 3 — Calendar
  'Scegli data e ora': 'Choose date and time',
  'Disponibile': 'Available',
  'Pochi posti': 'Few spots',
  'Completo': 'Full',
  'Caricamento orari...': 'Loading times...',
  'Nessun orario disponibile per questa data': 'No times available for this date',

  // Step 4 — Details
  'Riepilogo': 'Summary',
  'Durata': 'Duration',
  '+ {n} min pulizia': '+ {n} min cleanup',
  'Sconto': 'Discount',
  'Totale scontato': 'Discounted total',
  'Hai un codice sconto?': 'Have a discount code?',
  '(opzionale)': '(optional)',
  '-\u20AC{n} applicato': '-\u20AC{n} applied',
  'Applica': 'Apply',
  'I tuoi dati': 'Your details',
  'Conferma la tua prenotazione': 'Confirm your booking',
  'Inserisci i tuoi dati per confermare la prenotazione': 'Enter your details to confirm your booking',
  'Bentornato, {name}!': 'Welcome back, {name}!',
  'Convalidiamo la tua prenotazione utilizzando i dati del tuo profilo.': 'We will confirm your booking using your profile data.',
  'Nome *': 'First name *',
  'Mario': 'Mario',
  'Cognome *': 'Last name *',
  'Rossi': 'Rossi',
  'Telefono *': 'Phone *',
  'Cognome': 'Last name',
  'Nome': 'First name',
  'Email': 'Email',
  'Ricordami per la prossima prenotazione': 'Remember me for next booking',
  'Voglio registrarmi per salvare i miei dati': 'I want to register to save my data',
  'Crea un account per gestire le tue prenotazioni in futuro. Ti invieremo i dati di accesso via email.': 'Create an account to manage your bookings in the future. We will send your login details via email.',
  'Crea Password *': 'Create password *',
  'Almeno 6 caratteri': 'At least 6 characters',
  'Conferma Password *': 'Confirm password *',
  'Ripeti la password': 'Repeat the password',

  // Validation
  'Nome obbligatorio': 'First name required',
  'Telefono obbligatorio': 'Phone required',
  'Telefono non valido': 'Invalid phone number',
  'Email non valida': 'Invalid email',
  'Email obbligatoria per la registrazione': 'Email required for registration',
  'La password deve avere almeno 6 caratteri': 'Password must be at least 6 characters',
  'Le password non coincidono': 'Passwords do not match',

  // Coupon
  'Codice non valido': 'Invalid code',
  'Errore nella verifica': 'Verification error',

  // Confirmation
  'Prenotazione confermata!': 'Booking confirmed!',
  'Grazie, ti aspettiamo!': 'Thank you, see you soon!',
  'Cliente': 'Customer',
  'Sconto applicato': 'Discount applied',
  'Aggiungi al Calendario': 'Add to Calendar',
  'Annulla questa prenotazione': 'Cancel this booking',
  'Torna alla Home': 'Back to Home',

  // PWA install
  "Scarica l'app sul tuo telefono": "Install the app on your phone",
  'Installa IntelliGenda': 'Install IntelliGenda',
  'Tocca il pulsante Condividi in basso': 'Tap the Share button at the bottom',
  'Seleziona Aggiungi a Home': 'Select Add to Home Screen',
  'Conferma con Aggiungi': 'Confirm with Add',

  // Submit
  'Prenotazione in corso...': 'Booking in progress...',
  'Conferma e Prenota': 'Confirm & Book',
  'Finalizza Prenotazione': 'Complete Booking',
  'Continua': 'Continue',
  'Errore nella prenotazione': 'Booking error',

  // Calendar (used programmatically)
  'Appuntamento': 'Appointment',

  // Account connected
  'Account connesso \u2014 {email}': 'Account connected \u2014 {email}',
  'Completa i dati qui sotto per confermare la prenotazione.': 'Complete the details below to confirm your booking.',
  'oppure': 'or',
  'Hai gia un account?': 'Already have an account?',
  'Accedi per gestire le tue prenotazioni.': 'Log in to manage your bookings.',
  "Scarica l'app per le prossime prenotazioni": "Install the app for future bookings",

  // Google Calendar
  'Operatore: {name}': 'Staff: {name}',
  'Prenotazione confermata per {services}': 'Booking confirmed for {services}',
  'Totale: \u20AC{n}': 'Total: \u20AC{n}',
  'Durata: {n}': 'Duration: {n}',

  // Page header
  'Prenota': 'Book',
}

// English month/day names for calendar
export const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const EN_DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']

// ==================== HOOK ====================

/**
 * Returns a translation function `t(key: string) => string`.
 * If the current tenant is not "marualisa", returns the key unchanged.
 */
export function useT(): (key: string) => string {
  // Read tenant slug from cookie (set by middleware)
  let slug = ''
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)
    if (match) slug = decodeURIComponent(match[1])
  }

  const isEn = slug === 'marualisa'

  return (key: string): string => {
    if (!isEn) return key
    return EN[key] ?? key // fallback to original if no translation found
  }
}

/**
 * Same as useT but for use outside React components (e.g. utility functions).
 * Accepts slug as parameter.
 */
export function getTranslator(slug: string): (key: string) => string {
  const isEn = slug === 'marualisa'
  return (key: string): string => {
    if (!isEn) return key
    return EN[key] ?? key
  }
}