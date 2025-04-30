"use client"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) {
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const size = 500
  return (
    <div
      ref={ref}
      className={`h-full w-full overflow-hidden [mask-image:radial-gradient(100%_100%_at_top_right,black,transparent)] ${className}`}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="radial-gradient" cx="100%" cy="0%" r="100%" fx="100%" fy="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#radial-gradient)" />
      </svg>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: `radial-gradient(${size}px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 80%)`,
        }}
      />
    </div>
  )
}
