# Task 4: Dark Mode Support for Admin Layout Sidebar

## Agent: dark-mode-admin-layout

## Summary
Added comprehensive dark mode support to `/home/z/my-project/src/app/admin/layout.tsx` by applying `dark:` Tailwind classes to all color-related CSS classes, and imported/placed the `ThemeToggle` component in the sidebar footer.

## Changes Made

### File: `src/app/admin/layout.tsx`

#### 1. Added Import
- Imported `{ ThemeToggle }` from `'@/components/ThemeToggle'`

#### 2. Dark Classes Applied (complete mapping)

| Element | Light Class | Dark Class Added |
|---------|-------------|-----------------|
| Loading spinner container | `bg-stone-50` | `dark:bg-stone-800` |
| Loading spinner border | `border-stone-300` | `dark:border-stone-600` |
| Loading spinner accent | `border-t-stone-900` | `dark:border-t-stone-100` |
| Main wrapper | `bg-stone-100` | `dark:bg-stone-900` |
| Sidebar bg | `bg-white` | `dark:bg-stone-900` |
| Sidebar border | `border-stone-200` | `dark:border-stone-700` |
| Sidebar header border | `border-stone-100` | `dark:border-stone-800` |
| Logo text | `text-stone-900` | `dark:text-stone-100` |
| Close button hover | `hover:bg-stone-100` | `dark:hover:bg-stone-700` |
| Active nav item | `bg-stone-900 text-white` | `dark:bg-stone-100 dark:text-stone-900` |
| Inactive nav item | `text-stone-600 hover:bg-stone-100` | `dark:text-stone-400 dark:hover:bg-stone-700` |
| Footer border | `border-stone-100` | `dark:border-stone-800` |
| PWA install button | `bg-stone-900 text-white hover:bg-stone-800` | `dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200` |
| iOS PWA button | `bg-blue-600 hover:bg-blue-700` | `dark:bg-blue-500 dark:hover:bg-blue-400` |
| iOS hint box | `bg-blue-50 border-blue-200 text-blue-800` | `dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200` |
| iOS hint close hover | `hover:bg-blue-100` | `dark:hover:bg-blue-900` |
| iOS hint list text | `text-blue-700` | `dark:text-blue-300` |
| "Vai al sito" link | `text-stone-500 hover:bg-stone-100` | `dark:text-stone-400 dark:hover:bg-stone-700` |
| Support link | `text-stone-500 hover:bg-stone-100` | `dark:text-stone-400 dark:hover:bg-stone-700` |
| Logout button | `text-red-500 hover:bg-red-50` | `dark:text-red-400 dark:hover:bg-red-950` |
| Theme label | `text-stone-400` | `dark:text-stone-500` |
| Mobile header bg | `bg-white/80` | `dark:bg-stone-950/80` |
| Mobile header border | `border-stone-200` | `dark:border-stone-700` |
| Menu button hover | `hover:bg-stone-100` | `dark:hover:bg-stone-700` |
| Menu icon | `text-stone-600` | `dark:text-stone-400` |
| Header title | `text-stone-900` | `dark:text-stone-100` |
| Quick-add link | `text-stone-600 hover:bg-stone-100 hover:text-stone-900` | `dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100` |

#### 3. ThemeToggle Placement
Added ThemeToggle in the sidebar footer area (inside the `<div className="p-3 border-t ...">` section) as the last item, just before the closing `</div>`:
```tsx
{/* Theme Toggle */}
<div className="flex items-center gap-3 px-3 py-2.5">
  <ThemeToggle />
  <span className="text-xs text-stone-400 dark:text-stone-500">Tema</span>
</div>
```

### Notes
- No logic or functionality was changed
- All 23 color-related classes received proper dark: variants
- The mobile sidebar overlay (`bg-black/30`) works fine in both modes — no dark variant needed
- Pre-existing lint error (setState in effect, line 62) is unrelated to this task
