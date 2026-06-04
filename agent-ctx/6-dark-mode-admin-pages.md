# Task 6: Dark Mode Support for Admin Pages

## Agent: dark-mode-admin-pages

## Summary
Added dark mode support to ALL 11 admin pages (12 files total, 1 redirect-only skipped) by adding `dark:` Tailwind class variants to every color-related CSS class.

## Files Modified (11 files)

| # | File | Changes Added |
|---|------|--------------|
| 1 | `src/app/admin/dashboard/page.tsx` | +426 chars |
| 2 | `src/app/admin/calendario/page.tsx` | +4,993 chars (largest file) |
| 3 | `src/app/admin/clienti/page.tsx` | +920 chars |
| 4 | `src/app/admin/servizi/page.tsx` | +2,311 chars |
| 5 | `src/app/admin/impostazioni/page.tsx` | +3,784 chars |
| 6 | `src/app/admin/postazioni/page.tsx` | +1,192 chars |
| 7 | `src/app/admin/prenota/page.tsx` | +2,889 chars |
| 8 | `src/app/admin/coupon/page.tsx` | +1,321 chars |
| 9 | `src/app/admin/login/page.tsx` | +706 chars |
| 10 | `src/app/admin/forgot-password/page.tsx` | +463 chars |
| 11 | `src/app/admin/reset-password/page.tsx` | +733 chars |

| Skipped | `src/app/admin/page.tsx` | Redirect-only, no UI classes |

## Dark Mode Class Mappings Applied

### Backgrounds
- `bg-white` → `dark:bg-stone-900`
- `bg-stone-50` → `dark:bg-stone-800/50`
- `bg-stone-100` → `dark:bg-stone-800`
- `bg-stone-200` → `dark:bg-stone-700`
- `bg-stone-900` (buttons/active) → `dark:bg-stone-100`
- `bg-white/90` → `dark:bg-stone-900/90`

### Text
- `text-stone-900` → `dark:text-stone-100`
- `text-stone-800` → `dark:text-stone-200`
- `text-stone-700` → `dark:text-stone-300`
- `text-stone-600` → `dark:text-stone-400`
- `text-stone-500` → `dark:text-stone-400`
- `text-stone-400` → `dark:text-stone-500`
- `text-stone-300` → `dark:text-stone-600`

### Borders
- `border-stone-200` → `dark:border-stone-700`
- `border-stone-100` → `dark:border-stone-800`
- `border-stone-300` → `dark:border-stone-600`

### Hover States
- `hover:bg-stone-100` → `dark:hover:bg-stone-700`
- `hover:bg-stone-50` → `dark:hover:bg-stone-800`
- `hover:border-stone-300` → `dark:hover:border-stone-600`
- `hover:text-stone-700` → `dark:hover:text-stone-300`
- `hover:text-stone-900` → `dark:hover:text-stone-100`

### Status Colors (calendario)
- Confirmed: `dark:bg-emerald-900/50 dark:text-emerald-400`
- Pending: `dark:bg-amber-900/50 dark:text-amber-400`
- Cancelled: `dark:bg-red-900/50 dark:text-red-400`
- Blocked: `dark:bg-stone-700 dark:text-stone-400`

### Special Areas (calendario)
- Calendar grid cells: selected, today, closed, normal states
- Booking badges inside cells
- Modal overlays (close day, booking detail, time block)
- Bottom sheet for mobile day detail
- Desktop table view and mobile card list view
- WhatsApp reminder buttons

### Form Elements
- Inputs: `dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-stone-100`
- Toggle switches, checkboxes, buttons
- Error/success alerts

## Technical Approach
Used a Python script (`/tmp/add_dark_mode_v4.py`) with regex-based replacements:
- **Lookbehind** `(?<=[\s"\'{}])`: Ensures classes are matched as standalone tokens (not inside compound classes like `hover:bg-stone-100`)
- **Negative lookahead** `(?![/])`: Prevents base classes from matching opacity variants (e.g., `bg-white` won't match `bg-white/90`)
- **Ordered processing**: Longer/more specific patterns processed before shorter ones
- **Skip list**: `text-white` never gets dark variants (stays white in both modes)

## Verification
- No `dark:dark:` double prefixes
- No `hover:dark:` incorrect patterns
- No double application of same dark variant
- Lint passes (23 pre-existing errors, none from dark mode changes)
- All logic, functionality, state management, and component structure unchanged
