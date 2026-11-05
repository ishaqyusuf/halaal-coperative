import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

import { sanitizeShortcutMark } from "../model/shortcut-label"
import type { ShortcutEnvironment } from "../platform/cooperative-shortcut-platform"

/** In-app preview of the launcher art; the launcher may crop or badge it. */
export function CooperativeShortcutTile({
  cooperativeName,
  environment,
  mark,
  size = "default",
}: {
  cooperativeName: string
  environment: ShortcutEnvironment
  mark: string
  size?: "default" | "small"
}) {
  return (
    <View
      accessibilityLabel={`${cooperativeName} shortcut icon`}
      accessible
      className={cn(
        "items-center justify-center rounded-2xl bg-primary",
        size === "small" ? "size-10" : "size-16"
      )}
    >
      <Text
        className={cn(
          "font-extrabold tracking-tight text-primary-foreground",
          size === "small" ? "text-sm" : "text-xl"
        )}
      >
        {sanitizeShortcutMark(mark)}
      </Text>
      {environment !== "production" ? (
        <View className="absolute bottom-2 h-1 w-1/2 rounded-full bg-primary-foreground/70" />
      ) : null}
    </View>
  )
}
