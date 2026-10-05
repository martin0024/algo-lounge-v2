import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { DiscordAccessProvider } from "@/components/discord-access-provider"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { XpProvider } from "@/components/xp-provider"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "AlgoLounge",
    template: "%s · AlgoLounge",
  },
  description: "Algotime official website part of SCS Concordia",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider>
          <DiscordAccessProvider>
            <XpProvider>
              <SiteHeader />
              <main className="flex flex-1 flex-col">{children}</main>
            </XpProvider>
          </DiscordAccessProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
