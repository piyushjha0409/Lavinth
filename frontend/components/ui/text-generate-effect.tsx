"use client"
import { useEffect, useState } from "react"

export const TextGenerateEffect = ({ words }: { words: string }) => {
  const [wordArray, setWordArray] = useState<string[]>([])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setWordArray(words.split(""))
    }, 0)
    return () => clearTimeout(timeout)
  }, [words])

  return (
    <div className="flex flex-wrap">
      {wordArray.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="text-white animate-text-reveal inline-block"
          style={{
            animationDelay: `${index * 0.05}s`,
            animationFillMode: "backwards",
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </span>
      ))}
    </div>
  )
}
