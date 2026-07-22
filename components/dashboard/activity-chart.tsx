"use client"

export type ActivityDay = {
  iso: string
  label: string
  total: number
  accepted: number
}

const PLOT_HEIGHT = 128

export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.total))

  return (
    <div className="mt-4">
      <div className="flex items-end justify-between text-[10px] text-muted-foreground">
        <span className="tabular-nums">{max}</span>
      </div>
      <div
        className="relative mt-1 flex items-end gap-[2px] border-b border-border"
        style={{ height: PLOT_HEIGHT }}
      >
        {days.map((day) => {
          const barHeight =
            day.total === 0
              ? 0
              : Math.max(6, Math.round((day.total / max) * PLOT_HEIGHT))
          return (
            <div
              key={day.iso}
              className="group relative flex h-full max-w-6 flex-1 items-end justify-center"
            >
              {day.total > 0 ? (
                <div
                  className="w-full rounded-t-[4px] bg-primary transition-colors group-hover:brightness-110"
                  style={{ height: barHeight }}
                />
              ) : (
                <div className="h-[2px] w-full bg-border/70" />
              )}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-[11px] whitespace-nowrap text-popover-foreground shadow-md group-hover:block">
                <span className="font-medium">{day.label}</span>
                {" · "}
                {day.total} {day.total === 1 ? "submission" : "submissions"}
                {day.total > 0 && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {day.accepted} accepted
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{days[0]?.label}</span>
        <span>{days[Math.floor(days.length / 2)]?.label}</span>
        <span>{days[days.length - 1]?.label}</span>
      </div>
    </div>
  )
}
