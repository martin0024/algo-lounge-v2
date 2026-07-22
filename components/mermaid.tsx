"use client"

import { type ReactNode, useEffect, useId, useRef } from "react"
import mermaid from "mermaid"

import { cn } from "@/lib/utils"

let nextMermaidId = 0

type MermaidProps = {
  chart?: string
  className?: string
}

export function Mermaid({ chart, className }: MermaidProps) {
  if (!chart) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Diagram failed to load.
      </div>
    )
  }

  const reactId = useId()
  const mermaidId = reactId.replace(/:/g, "")
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false

    const run = async () => {
      el.innerHTML = ""

      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false

      mermaid.initialize({
        startOnLoad: false,
        theme: prefersDark ? "dark" : "default",
        securityLevel: "strict",
      })

      try {
        const { svg, bindFunctions } = await mermaid.render(mermaidId, chart)
        if (cancelled) return
        el.innerHTML = svg
        bindFunctions?.(el)
      } catch (err) {
        if (cancelled) return
        console.error("Mermaid render failed:", err)
        el.textContent = "Diagram failed to render."
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [chart, mermaidId])

  return (
    <div ref={containerRef} className={cn("mermaid", className)} aria-hidden />
  )
}

export function MermaidContent({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    let cancelled = false

    const run = async () => {
      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false

      mermaid.initialize({
        startOnLoad: false,
        theme: prefersDark ? "dark" : "default",
        securityLevel: "strict",
      })

      const blocks = root.querySelectorAll<HTMLPreElement>(
        'pre[data-language="mermaid"]'
      )

      for (const block of blocks) {
        const code = block.querySelector("code")
        const chart = code?.textContent?.trim()
        if (!chart) continue

        const host = document.createElement("div")
        host.className = "my-4 mermaid-diagram"

        try {
          const id = `algo-lounge-mermaid-${nextMermaidId++}`
          const { svg, bindFunctions } = await mermaid.render(id, chart)
          if (cancelled) return
          host.innerHTML = svg
          bindFunctions?.(host)
          const figure = block.closest("figure")
          ;(figure ?? block).replaceWith(host)
        } catch (err) {
          if (cancelled) return
          console.error("Mermaid render failed:", err)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [children])

  return <div ref={containerRef}>{children}</div>
}
