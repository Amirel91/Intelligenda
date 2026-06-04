# Task 7: Dark Mode for Customer-Facing Pages

**Agent:** dark-mode-customer-pages
**Status:** ✅ Completed

## Summary

Applied comprehensive dark mode support (`dark:` Tailwind classes) to all 7 customer-facing pages. No logic, functionality, state management, or component structure was changed — only Tailwind CSS class strings were modified.

## Files Modified

1. **`src/app/page.tsx`** — Tenant homepage
   - Added dark variants for: gradient background, headings, contact info links, CTA button (inverted), featured service pills, feature badges

2. **`src/app/prenota/page.tsx`** — Booking page (1812 lines, LARGE)
   - Applied dark classes to ALL sections: ServiceCard, StepServices (search, accordion categories, selection summary), StepOperator, StepCalendar (calendar grid, day colors, time slots), AccountSection (blue/amber boxes), BookingSummaryBlock, CouponInputBlock, StepCustomerInfo (form inputs, checkboxes, password fields), StepConfirmation (success page, calendar link, PWA install), header/footer (sticky bars, step indicator, next button)

3. **`src/app/prenota/cancella/[bookingId]/page.tsx`** — Cancel booking page
   - Applied dark classes to: loading spinner, cancelled state, booking detail card, warning box, error states, action buttons

4. **`src/app/account/page.tsx`** — Account page
   - Applied dark classes to: STATUS_CONFIG (trial/active/cancelling/suspended badges), header navbar, notification messages, "Gestisci la tua Agenda" card (inverted), subscription card, plan info blocks, status-specific sections, account info card, cancel modal (all elements including radio buttons, textarea, footer)

5. **`src/app/profilo/page.tsx`** — Customer profile page
   - Applied dark classes to: profile header card, avatar circle (inverted), contact info, CTA button (inverted), success/error notifications, upcoming booking cards (with emerald badges), past booking cards with status badges

6. **`src/app/login/page.tsx`** — Login page
   - Applied dark classes to: back link, header, form card, labels, inputs (with focus states), submit button (inverted), error box, register link, skeleton loader

7. **`src/app/register/page.tsx`** — Registration page
   - Applied dark classes to: back link, header, form card, all input fields, success animation, error box, login link, skeleton loader

## Dark Mode Class Mapping Used

Consistently applied across all files:
- `bg-white` → `dark:bg-stone-900`
- `bg-stone-50` → `dark:bg-stone-800/50`
- `bg-stone-100` → `dark:bg-stone-800`
- `bg-stone-900` (buttons) → `dark:bg-stone-100` + text inverted
- `text-stone-900` → `dark:text-stone-100`
- `text-stone-500` → `dark:text-stone-400`
- `border-stone-200` → `dark:border-stone-700`
- `hover:bg-stone-100` → `dark:hover:bg-stone-800`
- Color-specific: emerald, amber, red, blue variants with `dark:*-950/50` backgrounds
- `bg-white/80` → `dark:bg-stone-950/80`
- `focus:border-stone-900` → `dark:focus:border-stone-100`

## Notes

- Pre-existing lint errors in carousel.tsx, use-pwa-install.ts, account/page.tsx, and admin pages were NOT introduced by this change (they relate to setState in useEffect patterns)
- No logic changes were made
- All `dark:` classes follow the provided mapping consistently
