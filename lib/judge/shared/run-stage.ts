import type { Language } from "@/lib/content"
import type { RunStage } from "@/lib/judge/browser/run"

export const isCompiled = (language: Language) =>
  language === "c" || language === "cpp" || language === "java"

export function stageText(stage: RunStage | null, language: Language): string {
  switch (stage) {
    case "loading-runtime":
      if (language === "java") return "Downloading the Java runtime (JVM).…"
      return isCompiled(language)
        ? "Downloading the C/C++ toolchain.…"
        : "Loading the Python runtime…"
    case "compiling":
      return "Compiling your code… almost ready."
    case "running":
      return isCompiled(language)
        ? "Compiling & running on the server…"
        : "Running test cases…"
    default:
      return "Starting…"
  }
}

export function runButtonLabel(
  stage: RunStage | null,
  language: Language
): string {
  switch (stage) {
    case "loading-runtime":
      return isCompiled(language) ? "Loading…" : "Loading Python…"
    case "compiling":
      return "Compiling…"
    case "running":
      return "Running…"
    default:
      return "Run"
  }
}
