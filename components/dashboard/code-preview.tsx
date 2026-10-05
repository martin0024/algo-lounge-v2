"use client"

import * as React from "react"
import type { ReactNode } from "react"

import { codeToHtml } from "shiki"

import {
  CIcon,
  CppIcon,
  JavaIcon,
  JavaScriptIcon,
  PythonIcon,
} from "@/components/icons"
import { cn } from "@/lib/utils"

type PreviewLanguage = "typescript" | "python" | "c" | "cpp" | "java"

const shikiLang: Record<PreviewLanguage, string> = {
  typescript: "typescript",
  python: "python",
  c: "c",
  cpp: "cpp",
  java: "java",
}

export const languageMeta: Record<
  PreviewLanguage,
  { label: string; icon: () => ReactNode }
> = {
  typescript: { label: "TypeScript", icon: JavaScriptIcon },
  python: { label: "Python", icon: PythonIcon },
  c: { label: "C", icon: CIcon },
  cpp: { label: "C++", icon: CppIcon },
  java: { label: "Java", icon: JavaIcon },
}

export function LanguageMark({
  language,
  className,
}: {
  language: PreviewLanguage
  className?: string
}) {
  const { label, icon: Icon } = languageMeta[language]
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] [&>svg]:h-4 [&>svg]:w-4">
        <Icon />
      </span>
      <span>{label}</span>
    </span>
  )
}

export function CodePreview({
  code,
  language,
  className,
}: {
  code: string
  language: PreviewLanguage
  className?: string
}) {
  const [html, setHtml] = React.useState<string | null>(null)
  const { label, icon: Icon } = languageMeta[language]

  React.useEffect(() => {
    let cancelled = false
    setHtml(null)
    codeToHtml(code, {
      lang: shikiLang[language],
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
      defaultColor: false,
    })
      .then((next) => {
        if (!cancelled) setHtml(next)
      })
      .catch(() => {
        if (!cancelled) setHtml(null)
      })
    return () => {
      cancelled = true
    }
  }, [code, language])

  return (
    <div
      className={cn("overflow-hidden rounded-lg border bg-muted/40", className)}
    >
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] [&>svg]:h-4 [&>svg]:w-4">
          <Icon />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      {html ? (
        <div
          className="code-panel max-h-[min(50vh,28rem)] overflow-auto [&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-relaxed [&_pre]:m-0 [&_pre]:border-0 [&_pre]:bg-transparent [&_pre]:p-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="max-h-[min(50vh,28rem)] overflow-auto p-3 font-mono text-[13px] leading-relaxed text-muted-foreground">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
