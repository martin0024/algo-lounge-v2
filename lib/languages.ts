/**
 * Client-safe content constants. These live outside `lib/content.ts` because
 * that module reads the filesystem, which would drag `node:fs` into any client
 * bundle that just wants a language label.
 */

export const languages = ["typescript", "python", "c", "cpp", "java"] as const
export type Language = (typeof languages)[number]

export const languageLabels: Record<Language, string> = {
  typescript: "TypeScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
}

export const difficulties = ["easy", "medium", "hard"] as const
export type Difficulty = (typeof difficulties)[number]
