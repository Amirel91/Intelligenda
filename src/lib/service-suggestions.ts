export interface ServiceSuggestion {
  name: string
  durationMinutes: number
}

export const SERVICE_SUGGESTIONS: Record<string, ServiceSuggestion[]> = {
  // 🩺 MEDICI & SALUTE
  ODONTOIATRA: [
    { name: 'Visita di Controllo', durationMinutes: 30 },
    { name: 'Igiene Dentale', durationMinutes: 45 },
    { name: 'Otturazione', durationMinutes: 45 },
  ],
  IGIENISTA_DENTALE: [
    { name: 'Seduta di Igiene Standard', durationMinutes: 45 },
    { name: 'Sbiancamento Dentale', durationMinutes: 60 },
  ],
  FISIOTERAPIA_OSTEOPATA: [
    { name: 'Valutazione Iniziale', durationMinutes: 60 },
    { name: 'Seduta di Fisioterapia', durationMinutes: 45 },
    { name: 'Trattamento Osteopatico', durationMinutes: 50 },
  ],
  MEDICO_BASE: [
    { name: 'Visita Ambulatoriale', durationMinutes: 20 },
    { name: 'Certificato Medico', durationMinutes: 15 },
  ],
  DERMATOLOGO: [
    { name: 'Visita Specialistica', durationMinutes: 45 },
    { name: 'Controllo Nei', durationMinutes: 30 },
  ],
  PSICOLOGO: [
    { name: 'Seduta di Consulenza', durationMinutes: 50 },
    { name: 'Primo Colloquio', durationMinutes: 60 },
  ],
  NUTRIZIONISTA: [
    { name: 'Prima Visita + Piano Alimentare', durationMinutes: 60 },
    { name: 'Controllo Percorso', durationMinutes: 30 },
  ],
  // 💈 CURA DELLA PERSONA
  SALONI_CAPELLI: [
    { name: 'Taglio & Piega', durationMinutes: 45 },
    { name: 'Colore', durationMinutes: 90 },
    { name: 'Trattamento Rigenerante', durationMinutes: 60 },
  ],
  BARBERIA: [
    { name: 'Taglio Capelli Uomo', durationMinutes: 30 },
    { name: 'Rasatura Barba Rito', durationMinutes: 30 },
    { name: 'Taglio + Barba', durationMinutes: 60 },
  ],
  CENTRO_ESTETICO: [
    { name: 'Manicure Semipermanente', durationMinutes: 45 },
    { name: 'Pedicure Curativo', durationMinutes: 50 },
    { name: 'Ceretta Totale', durationMinutes: 60 },
    { name: 'Pulizia Viso', durationMinutes: 60 },
  ],
  MASSAGGI_OLISTICO: [
    { name: 'Massaggio Rilassante', durationMinutes: 60 },
    { name: 'Massaggio Decontratturante', durationMinutes: 50 },
  ],
  TATUAGGI_PIERCING: [
    { name: 'Consulenza Disegno', durationMinutes: 30 },
    { name: 'Sessione Tattoo Piccola', durationMinutes: 60 },
    { name: 'Applicazione Piercing', durationMinutes: 20 },
  ],
  ONICOTECNICA: [
    { name: 'Ricostruzione Gel', durationMinutes: 90 },
    { name: 'Refill Gel', durationMinutes: 60 },
  ],
  // 🚗 MOTORI & LOGISTICA
  AUTOFFICINA: [
    { name: 'Tagliando Auto', durationMinutes: 90 },
    { name: 'Diagnosi Elettronica', durationMinutes: 45 },
    { name: 'Cambio Pastiglie Freni', durationMinutes: 60 },
  ],
  GOMMISTA: [
    { name: 'Cambio Gomme Stagionale', durationMinutes: 30 },
    { name: 'Convergenza ed Equilibratura', durationMinutes: 30 },
  ],
  LAVAGGIO_AUTO: [
    { name: 'Lavaggio Interno/Esterno', durationMinutes: 60 },
    { name: 'Igienizzazione Abitacolo', durationMinutes: 45 },
  ],
  // ⚖️ CONSULENZA & LEGALE
  STUDIO_LEGALE: [
    { name: 'Consulenza Legale', durationMinutes: 45 },
    { name: 'Esame Pratica/Documenti', durationMinutes: 60 },
  ],
  COMMERCIALISTA: [
    { name: 'Consulenza Fiscale', durationMinutes: 45 },
    { name: 'Dichiarazione dei Redditi', durationMinutes: 60 },
  ],
  AGENZIA_IMMOBILIARE: [
    { name: 'Valutazione Immobile', durationMinutes: 60 },
    { name: 'Appuntamento di Visita', durationMinutes: 45 },
  ],
  // 🐶 ANIMALI
  TOELETTATURA: [
    { name: 'Lavaggio + Asciugatura', durationMinutes: 45 },
    { name: 'Tosatura & Taglio', durationMinutes: 60 },
  ],
  VETERINARIO: [
    { name: 'Visita di Controllo', durationMinutes: 30 },
    { name: 'Vaccinazione', durationMinutes: 15 },
  ],
  // 📚 ISTRUZIONE & SPORT
  INSEGNANTE_PRIVATO: [
    { name: 'Ripetizione / Tutoraggio', durationMinutes: 60 },
    { name: 'Lezione Singola Lingua', durationMinutes: 60 },
  ],
  PERSONAL_TRAINER: [
    { name: 'Allenamento Individuale', durationMinutes: 60 },
    { name: 'Check Corporeo Anamnesi', durationMinutes: 45 },
  ],
  // ALTRO
  ALTRO: [],
}

export function getSuggestions(activityType: string): ServiceSuggestion[] {
  return SERVICE_SUGGESTIONS[activityType] ?? []
}
