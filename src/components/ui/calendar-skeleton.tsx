/**
 * CalendarSkeleton — Shimmer placeholder for the Step 3 calendar.
 *
 * Reproduces the exact layout of the real calendar (7 cols × 6 rows)
 * to prevent layout shift. Uses pure CSS shimmer gradient animation —
 * zero JS animation overhead.
 */
export function CalendarSkeleton() {
  const dayNames = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      {/* Month navigation skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-lg shimmer-box" />
        <div className="h-5 w-28 rounded shimmer-box" />
        <div className="w-9 h-9 rounded-lg shimmer-box" />
      </div>

      {/* Day headers — real text (already visible instantly) */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells skeleton — 6 rows × 7 cols = 42 cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg shimmer-box"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * SlotsSkeleton — Shimmer placeholder for the time slots grid.
 * Shown while individual slot data is loading after a date is tapped.
 */
export function SlotsSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="py-3 rounded-xl shimmer-box"
        />
      ))}
    </div>
  )
}
