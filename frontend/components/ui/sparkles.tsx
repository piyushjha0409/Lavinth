"use client"
import { useEffect, useRef, useState } from "react"
import { createNoise3D } from "simplex-noise"

export const SparklesCore = ({
  id,
  background,
  minSize,
  maxSize,
  speed,
  particleColor,
  particleDensity,
  className,
  particleOpacity,
}: {
  id?: string
  background?: string
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
  className?: string
  particleOpacity?: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noiseRef = useRef(createNoise3D())
  const [time, setTime] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          canvas.width = entry.contentRect.width
          canvas.height = entry.contentRect.height
        }
      }
    })

    resizeObserver.observe(canvas)

    const particleCount = Math.min(
      Math.max(Math.floor((canvas.width * canvas.height) / 8000), 40),
      particleDensity || 100,
    )

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * ((maxSize || 4) - (minSize || 1)) + (minSize || 1),
      speed: Math.random() * (speed || 0.2) + 0.1,
      opacity: Math.random() * (particleOpacity || 1),
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = background || "rgba(0, 0, 0, 0)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        const { x, y, size, opacity } = particle
        const n = noiseRef.current(x * 0.01, y * 0.01, time * 0.1) * 2
        const angle = n * Math.PI

        particle.x += Math.cos(angle) * particle.speed
        particle.y += Math.sin(angle) * particle.speed

        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        ctx.fillStyle = particleColor || "white"
        ctx.globalAlpha = opacity
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      setTime((prevTime) => prevTime + 0.01)
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
    }
  }, [time, background, minSize, maxSize, speed, particleColor, particleDensity, particleOpacity])

  return <canvas ref={canvasRef} id={id} className={className} style={{ width: "100%", height: "100%" }} />
}
