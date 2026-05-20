---
Task ID: 1
Agent: Main Agent
Task: Add QR Code for shop window (vetrina) in admin settings Negozio tab

Work Log:
- Explored admin settings page structure (`src/app/admin/impostazioni/page.tsx`)
- Identified 4 tabs: negozio, orari, postazioni, password
- Determined tenant slug is accessible via `tenant_slug` cookie (httpOnly: false)
- Installed `qrcode.react` v4.2.0
- Added QR Code section to Negozio tab with:
  - Dynamic URL generation (subdomain for production, `/t/slug` for Vercel)
  - `QRCodeCanvas` component (size 200, level H, stone-900 foreground)
  - Elegant box with stone-50 background and rounded-2xl corners
  - Download button that exports canvas to PNG with 32px white padding
  - Filename: `qrcode-intelligenda.png`
- Verified zero new TypeScript errors (pre-existing errors in legacy SPA components only)

Stage Summary:
- Commit: `43430e0` — "feat: add QR Code for shop window in admin Negozio tab"
- Files modified: `src/app/admin/impostazioni/page.tsx`, `package.json`, `package-lock.json`
- Library added: `qrcode.react@4.2.0`
- The QR code section appears below the shop info form in the Negozio tab

---
Task ID: 1
Agent: Main Agent
Task: Enterprise polish — 4 rifiniture strategiche (WhatsApp, Clienti, etc.)

Work Log:
- Analyzed existing codebase: found features 1 (Google Calendar), 2 (Rate Limiting), 3a (Cancel route), 4b (Print CSS) already implemented
- Added WhatsApp button in admin booking detail modal (calendario/page.tsx)
- Added MessageCircle icon import from lucide-react
- Added shopName state + fetch from /api/config for personalized WhatsApp messages
- Created openWhatsApp() function with pre-filled message including cancel link
- Created /api/clients/route.ts — Prisma groupBy aggregation endpoint (admin-only)
- Created /admin/clienti/page.tsx — Client archive with search, sort, CSV export, responsive design
- Added 'Clienti' nav item in admin layout sidebar with Users icon
- Verified: zero TypeScript errors, clean build, push to GitHub

Stage Summary:
- Commit: 29581cf — "feat: enterprise polish — WhatsApp button, Clienti archive page"
- Files created: src/app/admin/clienti/page.tsx, src/app/api/clients/route.ts
- Files modified: src/app/admin/calendario/page.tsx, src/app/admin/layout.tsx
- All 4 requested features verified complete (2 were already implemented)
