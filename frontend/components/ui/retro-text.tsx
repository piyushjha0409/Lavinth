"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface RetroTextProps {
  children: ReactNode
  className?: string
  glitch?: boolean
  glow?: boolean
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div"
}

export const RetroText = ({
  children,
  className,
  glitch = false,
  glow = true,
  as: Component = "div",
}: RetroTextProps) => {
  const text = typeof children === "string" ? children : ""

  if (glitch) {
    return (
      <Component className={cn("retro-text font-mono", glow && "retro-glow", className)} data-text={text}>
        {children}
      </Component>
    )
  }

  return <Component className={cn("font-mono", glow && "retro-glow", className)}>{children}</Component>
}
