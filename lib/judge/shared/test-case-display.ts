import type { Language } from "@/lib/content"

import { toSnakeCase } from "./compare"

export function formatTestValue(value: unknown): string {
  return JSON.stringify(value)
}

export function getArgNames(
  args: string[] | undefined,
  inputLength: number
): string[] {
  if (args && args.length === inputLength) {
    return args
  }
  return Array.from({ length: inputLength }, (_, index) => `arg${index}`)
}

export function formatArgName(name: string, language: Language): string {
  return language === "python" ? toSnakeCase(name) : name
}

export function formatNamedInputs(
  input: unknown[],
  argNames: string[],
  language: Language
): string[] {
  return input.map((value, index) => {
    const name = formatArgName(argNames[index] ?? `arg${index}`, language)
    return `${name} = ${formatTestValue(value)}`
  })
}
