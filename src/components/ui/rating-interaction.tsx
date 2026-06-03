'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface RatingInteractionProps {
  onChange?: (rating: number) => void
  className?: string
}

const ratingData = [
  { emoji: '😔', label: 'Terribile' },
  { emoji: '😕', label: 'Scarso' },
  { emoji: '😐', label: 'Normale' },
  { emoji: '🙂', label: 'Buono' },
  { emoji: '😍', label: 'Ottimo' },
]

export function RatingInteraction({ onChange, className }: RatingInteractionProps) {
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const handleClick = (value: number) => {
    setRating(value)
    setSubmitted(true)
    onChange?.(value)
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {!submitted ? (
        <>
          <span className="text-xs font-medium text-stone-400">Come è andata?</span>
          <div className="flex items-center gap-2">
            {ratingData.map((item, i) => {
              const value = i + 1

              return (
                <button
                  key={value}
                  onClick={() => handleClick(value)}
                  className="group relative focus:outline-none"
                  aria-label={`Vota ${value}: ${item.label}`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110 group-active:scale-95">
                    <span className="text-2xl select-none transition-all duration-200 grayscale opacity-40 group-hover:opacity-70 group-hover:grayscale-[0.3] group-hover:scale-110">
                      {item.emoji}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1.5 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">Grazie per il feedback!</span>
        </div>
      )}
    </div>
  )
}
