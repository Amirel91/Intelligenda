'use client'
import React from 'react'
import Image from 'next/image'

interface IntelliGendaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  textClassName?: string
}

const SIZE_PX = { sm: 20, md: 32, lg: 40, xl: 56 } as const
const TEXT_SIZE = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-2xl' } as const

export function IntelliGendaLogo({ size = 'md', showText = true, className = '', textClassName = '' }: IntelliGendaLogoProps) {
  const px = SIZE_PX[size]
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo.png" alt="IntelliGenda" width={px} height={px} className="shrink-0 object-contain" priority />
      {showText && <span className={`font-semibold tracking-tight text-stone-950 ${TEXT_SIZE[size]} ${textClassName}`}>IntelliGenda</span>}
    </div>
  )
}
