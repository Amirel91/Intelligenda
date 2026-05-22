/**
 * Static suggestion map for quick service creation.
 * Each entry maps an activity type ID to an array of suggested services
 * with a default name and duration in minutes.
 * The price is intentionally omitted — the admin fills it in.
 */
export interface ServiceSuggestion {
  name: string
  durationMinutes: number
}

export const SERVICE_SUGGESTIONS: Record<string, ServiceSuggestion[]> = {
  ESTETICA_BEAUTY: [
    { name: 'Manicure', durationMinutes: 30 },
    { name: 'Pulizia Viso', durationMinutes: 45 },
    { name: 'Ceretta Totale', durationMinutes: 60 },
    { name: 'Pedicure', durationMinutes: 45 },
  ],
  SALONI_CAPELLI: [
    { name: 'Taglio & Piega', durationMinutes: 45 },
    { name: 'Colore', durationMinutes: 90 },
    { name: 'Trattamento Keratina', durationMinutes: 120 },
    { name: 'Rasatura Barba', durationMinutes: 30 },
  ],
  BENESSERE_SPA: [
    { name: 'Massaggio Rilassante', durationMinutes: 60 },
    { name: 'Massaggio Decontratturante', durationMinutes: 50 },
    { name: 'Percorso SPA Coppia', durationMinutes: 90 },
    { name: 'Trattamento Corpo', durationMinutes: 60 },
  ],
  TATUAGGI_PIERCING: [
    { name: 'Consulenza Progetto', durationMinutes: 30 },
    { name: 'Sessione Tatuaggio Piccola', durationMinutes: 60 },
    { name: 'Sessione Tatuaggio Media', durationMinutes: 180 },
    { name: 'Applicazione Piercing', durationMinutes: 30 },
  ],
  AUTO_MOTO: [
    { name: 'Cambio Gomme Stagionale', durationMinutes: 30 },
    { name: 'Tagliando Auto', durationMinutes: 90 },
    { name: 'Diagnosi Elettronica', durationMinutes: 45 },
    { name: 'Lavaggio Completo', durationMinutes: 60 },
  ],
  FISIOTERAPIA_MEDICA: [
    { name: 'Prima Visita Specialistica', durationMinutes: 60 },
    { name: 'Seduta Fisioterapia', durationMinutes: 45 },
    { name: 'Trattamento Osteopatico', durationMinutes: 50 },
    { name: 'Terapia Riabilitativa', durationMinutes: 45 },
  ],
  PERSONAL_TRAINER_SPORT: [
    { name: 'Valutazione Iniziale', durationMinutes: 60 },
    { name: 'Sessione Personal Coaching', durationMinutes: 60 },
    { name: 'Consulenza Alimentare', durationMinutes: 45 },
    { name: 'Lezione Privata', durationMinutes: 60 },
  ],
  STUDI_LEALI_CONSULENZA: [
    { name: 'Consulenza Conoscitiva', durationMinutes: 45 },
    { name: 'Esame Pratica / Documenti', durationMinutes: 60 },
    { name: 'Sessione Strategica', durationMinutes: 90 },
  ],
  PET_GROOMING: [
    { name: 'Lavaggio & Asciugatura', durationMinutes: 45 },
    { name: 'Tosatura & Taglio', durationMinutes: 60 },
    { name: 'Taglio Unghie & Pulizia', durationMinutes: 20 },
  ],
  SCUOLE_CORSI: [
    { name: 'Lezione Individuale', durationMinutes: 60 },
    { name: 'Ripetizione / Tutoraggio', durationMinutes: 60 },
    { name: 'Verifica di Livello', durationMinutes: 45 },
  ],
  // ALTRO → empty array → no suggestions shown
  ALTRO: [],
}

/**
 * Returns the suggestions for a given activity type, or empty if not found.
 */
export function getSuggestions(activityType: string): ServiceSuggestion[] {
  return SERVICE_SUGGESTIONS[activityType] ?? []
}
