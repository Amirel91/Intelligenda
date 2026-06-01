'use client'
import React from 'react'
import Image from 'next/image'

interface IntelliGendaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  textClassName?: string
}

const SIZE_PX = { sm: 32, md: 52, lg: 68, xl: 96 } as const
const TEXT_SIZE = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' } as const

export function IntelliGendaLogo({ size = 'md', showText = true, className = '', textClassName = '' }: IntelliGendaLogoProps) {
  const px = SIZE_PX[size]
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo.png" alt="IntelliGenda" width={px} height={px} className="shrink-0 object-contain" priority />
      {showText && <span className={`font-semibold tracking-tight text-stone-950 ${TEXT_SIZE[size]} ${textClassName}`}>IntelliGenda</span>}
    </div>
  )
}
