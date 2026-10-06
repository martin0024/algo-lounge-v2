/** Concordia is in Montreal — days, streaks and XP caps roll over there. */
export const CLUB_TIME_ZONE = "America/Toronto"

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** `YYYY-MM-DD` in club time, so an 8pm submission doesn't count as tomorrow. */
export function dayKey(date: Date) {
  return dayFormatter.format(date)
}

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIME_ZONE,
  hour: "numeric",
  hour12: false,
})

/** Hour of day (0–23) in club time. */
export function clubHour(date: Date) {
  return Number(hourFormatter.format(date)) % 24
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.round((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
