import { Badge } from "@/components/ui/badge"
import type { Difficulty } from "@/lib/content"
import { cn } from "@/lib/utils"

const styles: Record<Difficulty, string> = {
  easy: "border-transparent bg-emerald-500 text-white dark:bg-emerald-700 dark:text-white",
  medium:
    "border-transparent bg-amber-500 text-white dark:bg-amber-700 dark:text-white",
  hard: "border-transparent bg-red-500 text-white dark:bg-red-700 dark:text-white",
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant="outline" className={cn("capitalize", styles[difficulty])}>
      {difficulty}
    </Badge>
  )
}
