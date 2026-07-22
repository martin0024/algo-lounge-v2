import { MDXRemote } from "next-mdx-remote/rsc"
import rehypePrettyCode from "rehype-pretty-code"
import remarkGfm from "remark-gfm"

import { MermaidContent } from "@/components/mermaid"

const prettyCodeOptions = {
  themes: { light: "github-light-default", dark: "github-dark-default" },
  keepBackground: false,
}

export function Mdx({ source }: { source: string }) {
  return (
    <MermaidContent>
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
          },
        }}
      />
    </MermaidContent>
  )
}
