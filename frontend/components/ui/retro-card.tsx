"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface RetroCardProps {
  children: ReactNode
  className?: string
  glowEffect?: boolean
}

export const RetroCard = ({ children, className, glowEffect = true }: RetroCardProps) => {
  return (
    <div
      className={cn(
        "relative border border-neon-500 bg-black p-4",
        glowEffect && "shadow-[0_0_10px_#0CFF0C]",
        className,
      )}
    >
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-neon-500" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-neon-500" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-neon-500" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-neon-500" />
      {children}
    </div>
  )
}
