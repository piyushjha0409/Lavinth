"use client"

import { useEffect, useRef } from "react"

interface DotPatternProps {
  className?: string
  dotColor?: string
  dotSize?: number
  dotSpacing?: number
  dotOpacity?: number
  gridStyle?: boolean
}

export const DotPattern = ({
  className = "",
  dotColor = "#0CFF0C", // Neon green
  dotSize = 1,
  dotSpacing = 20,
  dotOpacity = 0.3,
  gridStyle = false,
}: DotPatternProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return

      // Set canvas dimensions
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw dots or grid
      const rows = Math.ceil(canvas.height / dotSpacing)
      const cols = Math.ceil(canvas.width / dotSpacing)

      ctx.fillStyle = dotColor
      ctx.strokeStyle = dotColor
      ctx.globalAlpha = dotOpacity

      if (gridStyle) {
        // Draw grid lines
        ctx.lineWidth = 0.5

        // Draw horizontal lines
        for (let i = 0; i < rows; i++) {
          ctx.beginPath()
          ctx.moveTo(0, i * dotSpacing)
          ctx.lineTo(canvas.width, i * dotSpacing)
          ctx.stroke()
        }

        // Draw vertical lines
        for (let j = 0; j < cols; j++) {
          ctx.beginPath()
          ctx.moveTo(j * dotSpacing, 0)
          ctx.lineTo(j * dotSpacing, canvas.height)
          ctx.stroke()
        }
      } else {
        // Draw dots
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            ctx.beginPath()
            ctx.arc(j * dotSpacing, i * dotSpacing, dotSize, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    })

    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
    }
  }, [dotColor, dotSize, dotSpacing, dotOpacity, gridStyle])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: "none" }}
    />
  )
}
