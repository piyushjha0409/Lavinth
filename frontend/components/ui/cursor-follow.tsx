"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface CursorFollowProps {
  color?: string
  size?: number
  opacity?: number
  blur?: number
  className?: string
  retro?: boolean
}

export const CursorFollow = ({
  color = "#0CFF0C", // Neon green
  size = 20,
  opacity = 0.6,
  blur = 10,
  className = "",
  retro = true,
}: CursorFollowProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    window.addEventListener("mousemove", updatePosition)
    document.body.addEventListener("mouseenter", handleMouseEnter)
    document.body.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", updatePosition)
      document.body.removeEventListener("mouseenter", handleMouseEnter)
      document.body.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  if (retro) {
    return (
      <>
        <motion.div
          className={`fixed pointer-events-none z-50 ${className}`}
          animate={{
            x: position.x - size / 2,
            y: position.y - size / 2,
            opacity: isVisible ? opacity : 0,
          }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            mass: 0.5,
          }}
          style={{
            width: size,
            height: size,
            backgroundColor: "transparent",
            boxShadow: `0 0 ${blur}px ${color}, 0 0 ${blur * 2}px ${color}`,
            border: `1px solid ${color}`,
          }}
        />
        <motion.div
          className={`fixed pointer-events-none z-50 ${className}`}
          animate={{
            x: position.x - 1,
            y: position.y - 1,
            opacity: isVisible ? 1 : 0,
          }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            mass: 0.5,
          }}
          style={{
            width: 2,
            height: 2,
            backgroundColor: color,
            boxShadow: `0 0 5px ${color}, 0 0 10px ${color}`,
          }}
        />
        <motion.div
          className={`fixed pointer-events-none z-50 ${className}`}
          animate={{
            x: position.x - 10,
            y: position.y,
            opacity: isVisible ? 0.5 : 0,
          }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            mass: 0.5,
          }}
          style={{
            width: 1,
            height: 20,
            backgroundColor: color,
          }}
        />
        <motion.div
          className={`fixed pointer-events-none z-50 ${className}`}
          animate={{
            x: position.x,
            y: position.y - 10,
            opacity: isVisible ? 0.5 : 0,
          }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            mass: 0.5,
          }}
          style={{
            width: 20,
            height: 1,
            backgroundColor: color,
          }}
        />
      </>
    )
  }

  return (
    <motion.div
      className={`fixed pointer-events-none z-50 rounded-full ${className}`}
      animate={{
        x: position.x - size / 2,
        y: position.y - size / 2,
        opacity: isVisible ? opacity : 0,
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300,
        mass: 0.5,
      }}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        filter: `blur(${blur}px)`,
      }}
    />
  )
}
