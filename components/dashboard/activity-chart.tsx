"use client"

export type ActivityDay = {
  iso: string
  label: string
  total: number
  accepted: number
}

const PLOT_HEIGHT = 140

export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.total))

  return (
    <div className="mt-5">
      <div
        className="relative flex items-end gap-1 border-b border-border/70"
        style={{ height: PLOT_HEIGHT }}
        role="img"
        aria-label="Submissions over the last 5 weeks"
      >
        {days.map((day) => {
          const barHeight =
            day.total === 0
              ? 0
              : Math.max(8, Math.round((day.total / max) * PLOT_HEIGHT))
          const acceptedHeight =
            day.accepted === 0
              ? 0
              : Math.max(
                  day.accepted === day.total ? barHeight : 4,
                  Math.round((day.accepted / max) * PLOT_HEIGHT)
                )

          return (
            <div
              key={day.iso}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
            >
              {day.total > 0 ? (
                <div
                  className="relative w-full max-w-5 overflow-hidden rounded-t-md bg-primary/25 transition-[filter] group-hover:brightness-110"
                  style={{ height: barHeight }}
                >
                  {acceptedHeight > 0 ? (
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-md bg-primary"
                      style={{ height: acceptedHeight }}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="h-0.5 w-full max-w-5 rounded-full bg-border/60" />
              )}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-[11px] whitespace-nowrap text-popover-foreground shadow-md group-hover:block">
                <div className="font-medium">{day.label}</div>
                <div className="mt-0.5 text-muted-foreground">
                  {day.total === 0
                    ? "No submissions"
                    : `${day.total} submission${day.total === 1 ? "" : "s"} · ${day.accepted} accepted`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{days[0]?.label}</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary" />
            Accepted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary/25" />
            Other
          </span>
        </div>
        <span>{days[days.length - 1]?.label}</span>
      </div>
    </div>
  )
}
