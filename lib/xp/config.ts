// Master switch for the XP feature. Off by default so the app can ship without
// the XP bar/toasts/panel while the system is paused. Turn on with BOTH:
//   XP_ENABLED=1              (server: actually award XP in /api/submit)
//   NEXT_PUBLIC_XP_ENABLED=1  (client: render the XP bar, toasts, and panel)
// NEXT_PUBLIC_* is inlined at build time, so it is readable on client and server.
export const XP_UI_ENABLED = process.env.NEXT_PUBLIC_XP_ENABLED === "1"
