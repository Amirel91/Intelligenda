'use client'

import React from 'react'

/**
 * IntelliGenda — Brand Logo Component
 *
 * Geometric SVG mark representing "Incastro Perfetto del Tempo":
 * - Outer circle (clock face)
 * - Inner arc in the upper-right quadrant (time slot)
 * - 45° diagonal line (precision cut)
 * - Center dot (interlocking anchor)
 *
 * All strokes use `currentColor` for automatic theming.
 */

interface IntelliGendaLogoProps {
  /** Visual size of the SVG mark */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show "IntelliGenda" text beside the mark */
  showText?: boolean
  /** Additional classes on the outer wrapper */
  className?: string
  /** Additional classes on the text element */
  textClassName?: string
}

const SIZE_PX = { sm: 20, md: 32, lg: 40, xl: 56 } as const
const TEXT_SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-2xl' } as const

export function IntelliGendaLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}: IntelliGendaLogoProps) {
  const px = SIZE_PX[size]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Mark */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="IntelliGenda"
      >
        {/* Outer circle — thin, no fill */}
        <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.5" />

        {/* Inner arc — time slot (upper-right quadrant, 90°) */}
        <path
          d="M16 3.5 A12.5 12.5 0 0 1 28.5 16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 45° diagonal line — precision cut */}
        <line
          x1="5"
          y1="27"
          x2="27"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Center dot — interlocking anchor point */}
        <circle cx="16" cy="16" r="2" fill="currentColor" />
      </svg>

      {/* Brand Text */}
      {showText && (
        <span
          className={`font-semibold tracking-tight text-stone-950 ${TEXT_SIZE[size]} ${textClassName}`}
        >
          IntelliGenda
        </span>
      )}
    </div>
  )
}
