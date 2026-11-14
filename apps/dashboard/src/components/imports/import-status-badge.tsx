import { Badge } from "@halaalvest/ui/components/badge"
import { cn } from "@halaalvest/ui/lib/utils"
import { importStatusWord } from "@/lib/imports/import-words"

const toneClasses = {
  good: "border-emerald-300 bg-emerald-50 text-emerald-900",
  problem: "border-red-300 bg-red-50 text-red-900",
  waiting: "border-amber-300 bg-amber-50 text-amber-950",
} as const

export function ImportStatusBadge({ status }: { status: string }) {
  const word = importStatusWord(status)

  return (
    <Badge
      className={cn("h-7 px-2.5 text-sm font-medium", toneClasses[word.tone])}
      variant="outline"
    >
      {word.label}
    </Badge>
  )
}
