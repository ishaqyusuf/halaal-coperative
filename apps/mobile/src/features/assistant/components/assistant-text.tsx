import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

/**
 * Reply text with the small markdown subset the assistant writes:
 * paragraphs, `- ` / `1. ` lists and **bold**. Record names are untrusted
 * data, so nothing becomes a link or image.
 */
function Inline({ text }: { text: string }) {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {pieces.map((piece, index) =>
        piece.startsWith("**") && piece.endsWith("**") && piece.length > 4 ? (
          <Text
            // biome-ignore lint/suspicious/noArrayIndexKey: text pieces have no ids
            key={index}
            className="font-bold text-foreground"
          >
            {piece.slice(2, -2)}
          </Text>
        ) : (
          piece
        )
      )}
    </>
  )
}

export function AssistantText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  const base = "text-base leading-[22px] text-foreground"
  return (
    <View className="gap-2.5">
      {blocks.map((block, index) => {
        const lines = block.split("\n")
        const bullets = lines.every((line) => /^\s*[-*•]\s+/.test(line))
        const numbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line))
        if (bullets || numbered)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no ids
            <View key={index} className="gap-1">
              {lines.map((line, item) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lines have no ids
                <View key={item} className="flex-row gap-2">
                  <Text className={base}>{numbered ? `${item + 1}.` : "•"}</Text>
                  <Text className={cn(base, "min-w-0 flex-1")}>
                    <Inline
                      text={line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")}
                    />
                  </Text>
                </View>
              ))}
            </View>
          )
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: blocks have no ids
          <Text key={index} className={base} selectable>
            <Inline text={block} />
          </Text>
        )
      })}
    </View>
  )
}
