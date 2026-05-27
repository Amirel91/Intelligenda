'use client'
import React from 'react'
import Image from 'next/image'

interface IntelliGendaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  textClassName?: string
}

const SIZE_PX = { sm: 28, md: 44, lg: 56, xl: 80 } as const
const TEXT_SIZE = { sm: 'text-base', md: 'text-lg', lg: 'text-xl', xl: 'text-3xl' } as const

export function IntelliGendaLogo({ size = 'md', showText = true, className = '', textClassName = '' }: IntelliGendaLogoProps) {
  const px = SIZE_PX[size]
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo.png" alt="IntelliGenda" width={px} height={px} className="shrink-0 object-contain" priority />
      {showText && <span className={`font-semibold tracking-tight text-stone-950 ${TEXT_SIZE[size]} ${textClassName}`}>IntelliGenda</span>}
    </div>
  )
}
