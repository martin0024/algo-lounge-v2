"use client"

import { useEffect, useRef } from "react"

import { indentWithTab } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { syntaxHighlighting } from "@codemirror/language"
import { Compartment, EditorState } from "@codemirror/state"
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark"
import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { useTheme } from "next-themes"

import type { Language } from "@/lib/content"

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "transparent" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    overflow: "auto",
  },
  ".cm-content": { padding: "12px 0" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--color-muted-foreground)",
    opacity: "0.6",
  },
  "&.cm-focused": { outline: "none" },
})

const darkChrome = EditorView.theme(
  {
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#abb2bf",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(110, 138, 190, 0.35)",
    },
    ".cm-cursor": { borderLeftColor: "#528bff" },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(110, 138, 190, 0.3)",
      outline: "none",
    },
  },
  { dark: true }
)

const lightChrome = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "rgba(0, 0, 0, 0.03)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
})

const darkExtensions = [syntaxHighlighting(oneDarkHighlightStyle), darkChrome]

export function CodeEditor({
  value,
  language,
  onChange,
}: {
  value: string
  language: Language
  onChange: (code: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartmentRef = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === "dark"

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          language === "python" ? python() : javascript({ typescript: true }),
          baseTheme,
          themeCompartmentRef.current.of(dark ? darkExtensions : lightChrome),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  useEffect(() => {
    const view = viewRef.current
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        dark ? darkExtensions : lightChrome
      ),
    })
  }, [dark])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 bg-black/[0.03] dark:bg-black/25"
    />
  )
}
