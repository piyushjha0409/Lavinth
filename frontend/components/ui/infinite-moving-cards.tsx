"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string
    name: string
    title: string
  }[]
  direction?: "left" | "right"
  speed?: "fast" | "normal" | "slow"
  pauseOnHover?: boolean
  className?: string
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollerRef = React.useRef<HTMLUListElement>(null)

  const [start, setStart] = useState(false)

  useEffect(() => {
    setStart(true)
  }, [])

  const speedMap = {
    fast: 20,
    normal: 40,
    slow: 60,
  }

  const getDirection = () => {
    if (direction === "left") {
      return "-"
    }
    return ""
  }

  const getAnimationDuration = () => {
    if (scrollerRef.current) {
      const scrollerWidth = scrollerRef.current.offsetWidth
      return `${scrollerWidth / speedMap[speed]}s`
    }
    return "0s"
  }

  return (
    <div ref={containerRef} className={cn("scroller relative z-20 max-w-7xl overflow-hidden", className)}>
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
        style={
          {
            "--animation-duration": getAnimationDuration(),
            "--animation-direction": getDirection(),
          } as React.CSSProperties
        }
      >
        {items.map((item, idx) => (
          <li
            className="w-[350px] max-w-full flex-shrink-0 rounded-2xl border border-slate-700 bg-slate-800 px-8 py-6 md:w-[450px]"
            key={idx}
          >
            <blockquote>
              <div aria-hidden="true" className="user-select-none -mb-4 select-none text-slate-400">
                &ldquo;
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{item.quote}</p>
              <div aria-hidden="true" className="user-select-none -mt-4 select-none text-slate-400">
                &rdquo;
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300">{item.name}</p>
                <p className="text-sm text-slate-400">{item.title}</p>
              </div>
            </blockquote>
          </li>
        ))}
        {items.map((item, idx) => (
          <li
            className="w-[350px] max-w-full flex-shrink-0 rounded-2xl border border-slate-700 bg-slate-800 px-8 py-6 md:w-[450px]"
            key={`duplicate-${idx}`}
          >
            <blockquote>
              <div aria-hidden="true" className="user-select-none -mb-4 select-none text-slate-400">
                &ldquo;
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{item.quote}</p>
              <div aria-hidden="true" className="user-select-none -mt-4 select-none text-slate-400">
                &rdquo;
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300">{item.name}</p>
                <p className="text-sm text-slate-400">{item.title}</p>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  )
}
