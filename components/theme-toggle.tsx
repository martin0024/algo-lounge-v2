"use client"

import { IconMoon, IconSun } from "@tabler/icons-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string
  size?: "icon" | "icon-xs" | "icon-sm"
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size={size}
      aria-label="Toggle theme"
      className={cn("rounded-full", className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <IconSun className="dark:hidden" />
      <IconMoon className="hidden dark:block" />
    </Button>
  )
}
