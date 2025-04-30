"use client"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    title: string
    description: string
    link: string
    icon: any
  }[]
  className?: string
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 py-10", className)}>
      {items.map((item, idx) => (
        <Link
          href={item.link}
          key={idx}
          className="group relative block h-full w-full p-2"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 block h-full w-full rounded-lg bg-gradient-to-br from-blue-900/40 via-indigo-900/40 to-purple-900/40"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <div className="relative z-10 h-full w-full overflow-hidden rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="flex flex-col items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-900/20 p-2">
                  <item.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-400 text-left">{item.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
