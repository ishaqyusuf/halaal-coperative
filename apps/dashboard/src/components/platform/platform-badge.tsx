import { Badge } from "@halaalvest/ui/components/badge"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import type { PlatformWord } from "@/lib/platform/platform-words"

/** One plain status word with the shared tone colours. */
export function PlatformBadge({ word }: { word: PlatformWord }) {
  return (
    <Badge
      className={`h-7 px-2.5 text-sm ${memberStateToneClassNames[word.tone]}`}
      variant="outline"
    >
      {word.label}
    </Badge>
  )
}
