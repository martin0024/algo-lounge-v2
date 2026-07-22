import Link from "next/link"

import { IconArrowLeft, IconList } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-3xl font-bold text-primary">404</p>
      <h1 className="text-3xl font-bold sm:text-4xl">Page not found</h1>
      <p className="text-muted-foreground">
        That route doesn&apos;t exist, maybe the question moved, or the link is
        stale. Head back and keep solving.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" render={<Link href="/" />}>
          <IconArrowLeft data-icon="inline-start" />
          Home
        </Button>
        <Button render={<Link href="/questions" />}>
          <IconList data-icon="inline-start" />
          Browse questions
        </Button>
      </div>
    </div>
  )
}
