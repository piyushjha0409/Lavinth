"use client"
import { useRef, useState, useEffect } from "react"

export const Spotlight = ({
  className = "",
  fill = "white",
}: {
  className?: string
  fill?: string
}) => {
  const divRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (divRef.current) {
        const rect = divRef.current.getBoundingClientRect()
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
      }
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    if (divRef.current) {
      divRef.current.addEventListener("mouseenter", handleMouseEnter)
      divRef.current.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      if (divRef.current) {
        divRef.current.removeEventListener("mouseenter", handleMouseEnter)
        divRef.current.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  return (
    <div ref={divRef} className={`h-full w-full overflow-hidden ${className}`}>
      <svg className="absolute h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 opacity-50">
        <defs>
          <radialGradient
            id="radial-gradient"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(${mousePosition.x} ${mousePosition.y}) scale(200)`}
          >
            <stop offset="0%" stopColor={fill} stopOpacity="0.4" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#radial-gradient)"
          style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.3s" }}
        />
      </svg>
    </div>
  )
}
