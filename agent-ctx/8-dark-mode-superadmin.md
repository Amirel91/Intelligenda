# Task 8: Dark Mode Support — Superadmin & Utility Pages

## Agent: dark-mode-superadmin

## Summary
Applied dark mode `dark:` Tailwind classes to all color-related CSS classes across 5 files and added ThemeToggle component to each page.

## Files Modified

### 1. `/src/app/superadmin/page.tsx` (1350 lines)
- Added `import { ThemeToggle } from '@/components/ThemeToggle'`
- Added `<ThemeToggle />` in header right area (next to refresh/logout buttons)
- Applied dark: classes to ALL color-related Tailwind classes throughout
- Updated SUBSCRIPTION_LABELS config objects with dark mode bg/color variants
- Key mappings applied: `bg-white → dark:bg-stone-900`, `bg-stone-50 → dark:bg-stone-800`, `text-stone-900 → dark:text-stone-100`, `border-stone-200 → dark:border-stone-700`, etc.

### 2. `/src/app/superadmin/login/page.tsx` (111 lines)
- Added `import { ThemeToggle } from '@/components/ThemeToggle'`
- Added `<ThemeToggle />` in absolute top-right corner
- Applied dark: classes to all backgrounds, text, borders, placeholders, focus states, hover states
- Login form card: `bg-white dark:bg-stone-900`, submit button: `bg-stone-900 dark:bg-stone-100`

### 3. `/src/app/manutenzione/page.tsx` (28 lines)
- Converted to 'use client' (was already 'use client')
- Added `import { ThemeToggle } from '@/components/ThemeToggle'`
- Added `<ThemeToggle />` in absolute top-right corner
- Applied dark: classes to all backgrounds, text, icons, pulse dot

### 4. `/src/app/(landing)/termini/page.tsx` (170 lines)
- Added `import { ThemeToggle } from '@/components/ThemeToggle'`
- Added `<ThemeToggle />` in header (between logo and back link)
- Applied dark: classes throughout: `bg-white → dark:bg-stone-900`, section numbers `bg-stone-900 → dark:bg-stone-100 text-white → dark:text-stone-900`, all text colors, borders, links

### 5. `/src/app/(landing)/privacy/page.tsx` (184 lines)
- Added `import { ThemeToggle } from '@/components/ThemeToggle'`
- Added `<ThemeToggle />` in header (between logo and back link)
- Same dark mode mapping pattern as termini page

### 6. `/src/app/t/[slug]/page.tsx`
- Does not exist in the project — skipped

## Verification
- Ran `bun run lint` — all lint errors are pre-existing (setState-in-effect warnings in carousel.tsx, use-pwa-install.ts, and existing superadmin patterns)
- No new lint errors introduced by dark mode changes
- No logic, functionality, or component structure changes made
