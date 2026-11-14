import { cn } from "@halaalvest/ui/lib/utils"
import { Fragment, type ReactNode } from "react"

/**
 * Plain reply text with the small markdown subset the assistant writes:
 * paragraphs, `- ` / `1. ` lists and **bold**. Record names are untrusted
 * data, so nothing becomes a link, image or HTML.
 */
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((piece, index) =>
    piece.startsWith("**") && piece.endsWith("**") && piece.length > 4 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: text pieces have no ids
      <strong key={index} className="font-semibold text-foreground">
        {piece.slice(2, -2)}
      </strong>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: text pieces have no ids
      <Fragment key={index}>{piece}</Fragment>
    )
  )
}

export function AssistantText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className={cn("space-y-3 [overflow-wrap:anywhere]", className)}>
      {blocks.map((block, index) => {
        const lines = block.split("\n")
        const bullets = lines.every((line) => /^\s*[-*•]\s+/.test(line))
        const numbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line))
        if (bullets || numbered) {
          const List = numbered ? "ol" : "ul"
          return (
            <List
              // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no ids
              key={index}
              className={cn(
                "space-y-1 pl-5",
                numbered ? "list-decimal" : "list-disc"
              )}
            >
              {lines.map((line, item) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lines have no ids
                <li key={item}>
                  {inline(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}
                </li>
              ))}
            </List>
          )
        }
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no ids
          <p key={index} className="whitespace-pre-line">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}
