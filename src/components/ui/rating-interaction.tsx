'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface RatingInteractionProps {
  onChange?: (rating: number) => void
  className?: string
}

const ratingData = [
  { emoji: '😔', label: 'Terribile', color: 'from-red-400 to-red-500', shadowColor: 'shadow-red-500/30' },
  { emoji: '😕', label: 'Scarso', color: 'from-orange-400 to-orange-500', shadowColor: 'shadow-orange-500/30' },
  { emoji: '😐', label: 'Normale', color: 'from-yellow-400 to-yellow-500', shadowColor: 'shadow-yellow-500/30' },
  { emoji: '🙂', label: 'Buono', color: 'from-lime-400 to-lime-500', shadowColor: 'shadow-lime-500/30' },
  { emoji: '😍', label: 'Ottimo', color: 'from-emerald-400 to-emerald-500', shadowColor: 'shadow-emerald-500/30' },
]

export function RatingInteraction({ onChange, className }: RatingInteractionProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const handleClick = (value: number) => {
    setRating(value)
    onChange?.(value)
  }

  const displayRating = hoverRating || rating
  const activeData = displayRating > 0 ? ratingData[displayRating - 1] : null

  // Once a rating is confirmed (mouse leaves after click), show thank-you
  const showThankYou = rating > 0 && hoverRating === 0

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Emoji rating buttons */}
      <div className="flex items-center gap-3">
        {ratingData.map((item, i) => {
          const value = i + 1
          const isActive = value <= displayRating
          const isExact = value === displayRating
          const isLocked = rating > 0 && value !== rating

          return (
            <button
              key={value}
              onClick={() => handleClick(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={rating > 0}
              className={cn(
                'group relative focus:outline-none',
                rating > 0 && value !== rating && 'opacity-30 cursor-default'
              )}
              aria-label={`Vota ${value}: ${item.label}`}
            >
              <div
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ease-out',
                  isActive ? 'scale-110' : 'scale-100 group-hover:scale-105',
                  isLocked && 'pointer-events-none'
                )}
              >
                <span
                  className={cn(
                    'text-3xl transition-all duration-300 ease-out select-none',
                    isActive
                      ? 'grayscale-0 drop-shadow-lg'
                      : 'grayscale opacity-40 group-hover:opacity-70 group-hover:grayscale-[0.3]'
                  )}
                >
                  {item.emoji}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="relative h-7 w-36">
        {/* Default "Valuta l'esperienza" text */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            displayRating > 0 ? 'opacity-0 blur-md scale-95' : 'opacity-100 blur-0 scale-100'
          )}
        >
          <span className="text-sm font-medium text-muted-foreground">Valuta l&apos;esperienza</span>
        </div>

        {/* Rating labels with blur in/out effect */}
        {ratingData.map((item, i) => (
          <div
            key={i}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
              displayRating === i + 1 ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105'
            )}
          >
            <span className="text-sm font-semibold tracking-wide text-foreground">{item.label}</span>
          </div>
        ))}

        {/* Thank-you message after confirmed rating */}
        {showThankYou && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600">Grazie per il feedback!</span>
          </div>
        )}
      </div>
    </div>
  )
}
