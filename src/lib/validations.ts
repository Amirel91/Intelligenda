import { z } from 'zod'

// ============ CLIENT BOOKING ============

export const customerInfoSchema = z.object({
  customerName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  customerSurname: z.string().optional().or(z.literal('')),
  customerPhone: z
    .string()
    .min(8, 'Il telefono deve avere almeno 8 cifre')
    .regex(/^[+]?[\d\s()-]+$/, 'Formato telefono non valido'),
  customerEmail: z.string().email('Email non valida').optional().or(z.literal('')),
})

export const bookingSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Seleziona almeno un servizio'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Orario non valido'),
  resourceId: z.string().optional(),
  customer: customerInfoSchema,
})

// ============ ADMIN - SERVICE ============

export const serviceSchema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  price: z.coerce.number().min(0, 'Il prezzo deve essere positivo'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  durationMinutes: z.coerce.number().int().min(5, 'Durata minima 5 minuti').max(480, 'Durata massima 8 ore'),
  cleanupMinutes: z.coerce.number().int().min(0, 'Il tempo di pulizia non puo essere negativo').max(120, 'Max 120 minuti').default(0),
  bufferMinutes: z.coerce.number().int().min(0, 'Il buffer non puo essere negativo').max(120, 'Max 120 minuti').default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
})

// ============ ADMIN - CONFIG ============

export const configSchema = z.object({
  shopName: z.string().min(2, 'Il nome del negozio e obbligatorio'),
  shopDescription: z.string().default(''),
  shopPhone: z.string().optional().default(''),
  shopEmail: z.string().email('Email non valida').optional().or(z.literal('')),
  shopAddress: z.string().optional().default(''),
  lunchBreakEnabled: z.boolean().default(false),
  lunchBreakStart: z.string().regex(/^\d{2}:\d{2}$/).default('12:30'),
  lunchBreakEnd: z.string().regex(/^\d{2}:\d{2}$/).default('14:00'),
  minNoticeHours: z.coerce.number().int().min(0, 'Il preavviso minimo non puo essere negativo').max(48, 'Max 48 ore').default(1),
  features: z.array(z.string()).default([]),
})

export const workingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
})

// ============ ADMIN - CLOSED DATES ============

export const closedDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida'),
  reason: z.string().optional().default(''),
})

// ============ ADMIN - CLOSED PERIODS ============

export const closedPeriodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inizio non valida'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data fine non valida'),
  reason: z.string().optional().default(''),
}).refine(data => data.startDate <= data.endDate, {
  message: 'La data di fine deve essere uguale o successiva alla data di inizio',
})

// ============ ADMIN - AUTH ============

export const loginSchema = z.object({
  username: z.string().min(1, 'Username obbligatorio'),
  password: z.string().min(1, 'Password obbligatoria'),
})

// ============ ADMIN - CHANGE PASSWORD ============

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
  newPassword: z.string().min(6, 'La nuova password deve avere almeno 6 caratteri'),
})
