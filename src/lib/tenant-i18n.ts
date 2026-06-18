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
  'Durata totale:': 'Total duration:',
  'Orari disponibili per': 'Available times for',

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
  'applicato': 'applied',
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
  'Ora': 'Time',
  'min': 'min',

  // PWA install
  "Scarica l'app sul tuo telefono": "Install the app on your phone",
  'Installa IntelliGenda': 'Install IntelliGenda',
  'Tocca il pulsante': 'Tap the',
  'Condividi': 'Share',
  'in basso': 'at the bottom',
  'Seleziona': 'Select',
  'Aggiungi a Home': 'Add to Home Screen',
  'Conferma con': 'Confirm with',
  'Aggiungi': 'Add',

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
  'Account connesso': 'Account connected',
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

  // --- login/page.tsx ---
  'Torna indietro': 'Go back',
  'Inserisci le tue credenziali per accedere al tuo account.': 'Enter your credentials to access your account.',
  'Password': 'Password',
  'La tua password': 'Your password',
  'Accesso in corso...': 'Signing in...',
  'Credenziali non valide': 'Invalid credentials',
  'Errore': 'Error',
  'Non hai ancora un account?': "Don't have an account yet?",
  'Registrati qui': 'Sign up here',

  // --- register/page.tsx ---
  'Crea il tuo account per gestire le tue prenotazioni.': 'Create your account to manage your bookings.',
  'Nome completo *': 'Full name *',
  'Crea Password': 'Create password',
  'Conferma Password': 'Confirm password',
  'La password deve avere almeno 6 caratteri': 'Password must be at least 6 characters',
  'Le password non coincidono': 'Passwords do not match',
  'Errore nella registrazione': 'Registration error',
  'Registrazione in corso...': 'Creating account...',
  'Crea account': 'Create account',
  'Account creato!': 'Account created!',
  'Reindirizzamento in corso...': 'Redirecting...',
  'Hai gia un account?': 'Already have an account?',
  'Accedi qui': 'Log in here',

  // --- profilo/page.tsx ---
  'Torna alla home': 'Back to home',
  'Il tuo profilo': 'Your profile',
  'Non impostato': 'Not set',
  'Errore nel caricamento dei dati': 'Error loading data',
  'Vuoi annullare questa prenotazione?': 'Do you want to cancel this booking?',
  'Errore nella cancellazione': 'Cancellation error',
  'Prenotazione annullata con successo': 'Booking cancelled successfully',
  'Prossimi appuntamenti': 'Upcoming appointments',
  'Nessun appuntamento programmato': 'No upcoming appointments',
  'Prenota ora': 'Book now',
  'Confermato': 'Confirmed',
  'euro': 'euro',
  'Annulla': 'Cancel',
  'Storico': 'History',
  'Annullato': 'Cancelled',
  'Completato': 'Completed',

  // --- prenota/cancella/[bookingId]/page.tsx ---
  'Prenotazione non trovata o scaduta': 'Booking not found or expired',
  'Prenotazione Annullata': 'Booking Cancelled',
  'La tua prenotazione e stata cancellata con successo.': 'Your booking has been successfully cancelled.',
  'Lo slot e ora di nuovo disponibile per gli altri utenti.': 'The slot is now available again for other users.',
  'Annulla Prenotazione': 'Cancel Booking',
  'Conferma per liberare lo slot sul calendario': 'Confirm to free the calendar slot',
  'Data e Ora': 'Date & Time',
  'Questa azione e irreversibile. Lo slot verra liberato immediatamente e altri utenti potranno prenotarlo.': 'This action is irreversible. The slot will be freed immediately and other users will be able to book it.',
  'Torna Indietro': 'Go Back',
  'Annullamento...': 'Cancelling...',
  'Conferma Cancellazione': 'Confirm Cancellation',
  'Errore durante la cancellazione': 'Error during cancellation',
  'Errore di connessione. Riprova.': 'Connection error. Please try again.',
}

// English month/day names for calendar
export const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const EN_DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']

// ==================== HOOK ====================

/**
 * Returns whether the current tenant should display English.
 * Only true for "marualisa" — every other tenant returns false.
 */
export function useIsEn(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)
  return decodeURIComponent(match?.[1] || '') === 'marualisa'
}

/**
 * Returns a translation function `t(key: string) => string`.
 * If the current tenant is not "marualisa", returns the key unchanged.
 */
export function useT(): (key: string) => string {
  const isEn = useIsEn()

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