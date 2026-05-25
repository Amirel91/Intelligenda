import {
  Sparkles, Scissors, Waves, HeartPulse, Dumbbell, Stethoscope,
  GraduationCap, Car, Dog, Scale, Wrench, Syringe, Smile,
  type LucideIcon,
} from 'lucide-react'

export interface ActivityType {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  group: string
}

export const ACTIVITY_GROUPS = [
  { id: 'MEDICI_SALUTE', name: '🩺 Medici & Salute', items: ['ODONTOIATRA', 'IGIENISTA_DENTALE', 'FISIOTERAPIA_OSTEOPATA', 'MEDICO_BASE', 'DERMATOLOGO', 'PSICOLOGO', 'NUTRIZIONISTA'] },
  { id: 'CURA_PERSONA', name: '💇 Cura della Persona', items: ['SALONI_CAPELLI', 'BARBERIA', 'CENTRO_ESTETICO', 'MASSAGGI_OLISTICO', 'TATUAGGI_PIERCING', 'ONICOTECNICA'] },
  { id: 'MOTORI', name: '🚗 Motori & Logistica', items: ['AUTOFFICINA', 'GOMMISTA', 'LAVAGGIO_AUTO'] },
  { id: 'CONSULENZA_LEGALE', name: '⚖️ Consulenza & Legale', items: ['STUDIO_LEGALE', 'COMMERCIALISTA', 'AGENZIA_IMMOBILIARE'] },
  { id: 'ANIMALI', name: '🐶 Animali', items: ['TOELETTATURA', 'VETERINARIO'] },
  { id: 'ISTRUZIONE_SPORT', name: '📚 Istruzione & Sport', items: ['INSEGNANTE_PRIVATO', 'PERSONAL_TRAINER'] },
  { id: 'ALTRO', name: '🛠️ Altro', items: ['ALTRO'] },
] as const

export const ACTIVITY_TYPES: ActivityType[] = [
  // 🩺 MEDICI & SALUTE
  { id: 'ODONTOIATRA', name: 'Odontoiatra / Dentista', description: 'Visite, igiene dentale, otturazioni e cure dentali', icon: Stethoscope, color: 'text-teal-600', bgColor: 'bg-teal-50', group: 'MEDICI_SALUTE' },
  { id: 'IGIENISTA_DENTALE', name: 'Igienista Dentale', description: 'Igiene professionale, sbiancamento e trattamenti gengivali', icon: Smile, color: 'text-teal-500', bgColor: 'bg-teal-50', group: 'MEDICI_SALUTE' },
  { id: 'FISIOTERAPIA_OSTEOPATA', name: 'Fisioterapista / Osteopata', description: 'Riabilitazione, trattamenti fisioterapici e osteopatia', icon: HeartPulse, color: 'text-teal-700', bgColor: 'bg-teal-50', group: 'MEDICI_SALUTE' },
  { id: 'MEDICO_BASE', name: 'Medico di Base / Pediatra', description: 'Visite ambulatoriali, certificati e pediatria', icon: Stethoscope, color: 'text-teal-600', bgColor: 'bg-teal-50', group: 'MEDICI_SALUTE' },
  { id: 'DERMATOLOGO', name: 'Dermatologo / Specialista', description: 'Visite dermatologiche, controllo nei e trattamenti cutanei', icon: Stethoscope, color: 'text-teal-800', bgColor: 'bg-teal-50', group: 'MEDICI_SALUTE' },
  { id: 'PSICOLOGO', name: 'Psicologo / Psicoterapeuta', description: 'Sedute di psicoterapia, consulenza psicologica e colloqui', icon: HeartPulse, color: 'text-violet-600', bgColor: 'bg-violet-50', group: 'MEDICI_SALUTE' },
  { id: 'NUTRIZIONISTA', name: 'Nutrizionista / Dietista', description: 'Piani alimentari, prime visite e controlli nutrizionali', icon: HeartPulse, color: 'text-green-600', bgColor: 'bg-green-50', group: 'MEDICI_SALUTE' },
  // 💈 CURA DELLA PERSONA
  { id: 'SALONI_CAPELLI', name: 'Salone Acconciature / Parrucchiere', description: 'Taglio, piega, colore e trattamenti per capelli', icon: Scissors, color: 'text-rose-600', bgColor: 'bg-rose-50', group: 'CURA_PERSONA' },
  { id: 'BARBERIA', name: 'Barberia / Barbiere', description: 'Taglio uomo, rasatura barba e trattamenti maschili', icon: Scissors, color: 'text-rose-700', bgColor: 'bg-rose-50', group: 'CURA_PERSONA' },
  { id: 'CENTRO_ESTETICO', name: 'Centro Estetico / Estetista', description: 'Manicure, pedicure, ceretta, pulizia viso e cura del corpo', icon: Sparkles, color: 'text-pink-600', bgColor: 'bg-pink-50', group: 'CURA_PERSONA' },
  { id: 'MASSAGGI_OLISTICO', name: 'Massaggiatore / Olistico', description: 'Massaggi rilassanti, decontratturanti e trattamenti olistici', icon: Waves, color: 'text-cyan-600', bgColor: 'bg-cyan-50', group: 'CURA_PERSONA' },
  { id: 'TATUAGGI_PIERCING', name: 'Tatuatore / Piercer', description: 'Tatuaggi artistici, piercing e consulenza disegni', icon: HeartPulse, color: 'text-violet-600', bgColor: 'bg-violet-50', group: 'CURA_PERSONA' },
  { id: 'ONICOTECNICA', name: 'Onicotecnica / Ricostruzione Unghie', description: 'Ricostruzione gel, refill e nail art', icon: Sparkles, color: 'text-pink-500', bgColor: 'bg-pink-50', group: 'CURA_PERSONA' },
  // 🚗 MOTORI & LOGISTICA
  { id: 'AUTOFFICINA', name: 'Autofficina / Meccanico', description: 'Tagliando, diagnosi elettronica, riparazioni e manutenzione', icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-50', group: 'MOTORI' },
  { id: 'GOMMISTA', name: 'Gommista', description: 'Cambio gomme, convergenza, equilibratura e servizi pneumatici', icon: Car, color: 'text-blue-700', bgColor: 'bg-blue-50', group: 'MOTORI' },
  { id: 'LAVAGGIO_AUTO', name: 'Lavaggio Auto / Detailing', description: 'Lavaggio interno/esterno, igienizzazione abitacolo e detailing', icon: Car, color: 'text-blue-500', bgColor: 'bg-blue-50', group: 'MOTORI' },
  // ⚖️ CONSULENZA & LEGALE
  { id: 'STUDIO_LEGALE', name: 'Studio Legale / Avvocato', description: 'Consulenze legali, pratiche e assistenza giudiziaria', icon: Scale, color: 'text-amber-700', bgColor: 'bg-amber-50', group: 'CONSULENZA_LEGALE' },
  { id: 'COMMERCIALISTA', name: 'Commercialista / Consulente del Lavoro', description: 'Consulenza fiscale, dichiarazioni e gestione del personale', icon: Scale, color: 'text-amber-600', bgColor: 'bg-amber-50', group: 'CONSULENZA_LEGALE' },
  { id: 'AGENZIA_IMMOBILIARE', name: 'Agenzia Immobiliare / Broker', description: 'Valutazioni immobili, visite e intermediazione', icon: Scale, color: 'text-amber-800', bgColor: 'bg-amber-50', group: 'CONSULENZA_LEGALE' },
  // 🐶 ANIMALI
  { id: 'TOELETTATURA', name: 'Toelettatura / Pet Grooming', description: 'Lavaggio, tosatura, taglio e cura per animali', icon: Dog, color: 'text-lime-600', bgColor: 'bg-lime-50', group: 'ANIMALI' },
  { id: 'VETERINARIO', name: 'Veterinario', description: 'Visite di controllo, vaccinazioni e cure veterinarie', icon: Dog, color: 'text-lime-700', bgColor: 'bg-lime-50', group: 'ANIMALI' },
  // 📚 ISTRUZIONE & SPORT
  { id: 'INSEGNANTE_PRIVATO', name: 'Insegnante / Lezioni Private', description: 'Ripetizioni, lezioni di lingua e tutoring', icon: GraduationCap, color: 'text-indigo-600', bgColor: 'bg-indigo-50', group: 'ISTRUZIONE_SPORT' },
  { id: 'PERSONAL_TRAINER', name: 'Personal Trainer / Coach', description: 'Allenamenti individuali, preparazione atletica e check corporeo', icon: Dumbbell, color: 'text-orange-600', bgColor: 'bg-orange-50', group: 'ISTRUZIONE_SPORT' },
  // 🛠️ ALTRO
  { id: 'ALTRO', name: 'Attività Generica / Altro', description: 'Altre tipologie di attività e servizi', icon: Wrench, color: 'text-gray-600', bgColor: 'bg-gray-50', group: 'ALTRO' },
]

export type ActivityTypeKey = (typeof ACTIVITY_TYPES)[number]['id']

export function getActivityType(id: string): ActivityType | undefined {
  return ACTIVITY_TYPES.find((a) => a.id === id)
}
export function getActivityTypeName(id: string): string {
  return getActivityType(id)?.name || id
}
export function getActivityTypeColor(id: string): string {
  return getActivityType(id)?.color || 'text-gray-600'
}
export function getActivityTypeBg(id: string): string {
  return getActivityType(id)?.bgColor || 'bg-gray-50'
}
