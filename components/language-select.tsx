"use client"

import { useMemo, useSyncExternalStore } from "react"

import {
  CIcon,
  CppIcon,
  JavaIcon,
  JavaScriptIcon,
  PythonIcon,
} from "@/components/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Language } from "@/lib/content"

const LANGUAGES: Array<{
  value: Language
  label: string
  icon: typeof JavaScriptIcon
}> = [
  { value: "typescript", label: "TypeScript", icon: JavaScriptIcon },
  { value: "python", label: "Python", icon: PythonIcon },
  { value: "c", label: "C", icon: CIcon },
  { value: "cpp", label: "C++", icon: CppIcon },
  { value: "java", label: "Java", icon: JavaIcon },
]

export function LanguageSelect({
  value,
  onValueChange,
}: {
  value: Language
  onValueChange: (language: Language) => void
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const selectedLanguage = useMemo(
    () => LANGUAGES.find((item) => item.value === value) ?? LANGUAGES[0],
    [value]
  )
  const SelectedIcon = selectedLanguage.icon

  if (!mounted) {
    return (
      <div className="flex h-8 w-44 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm">
        <SelectedIcon />
        <span>{selectedLanguage.label}</span>
      </div>
    )
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as Language)}
    >
      <SelectTrigger className="w-44">
        <SelectValue>
          <span className="flex items-center gap-2">
            <SelectedIcon />
            <span>{selectedLanguage.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {LANGUAGES.map(({ value: languageValue, label, icon: Icon }) => (
          <SelectItem key={languageValue} value={languageValue}>
            <Icon />
            <span>{label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
