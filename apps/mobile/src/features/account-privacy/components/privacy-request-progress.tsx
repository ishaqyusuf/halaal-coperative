import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Clipboard, View } from "react-native"
import { PRIVACY_STEPS } from "../model/privacy-presentation"

/**
 * Received → Verified → Processing → Completed. `done` steps are checked;
 * the next one carries a ring (warm when the request waits on the person).
 */
export function PrivacySteps({
  done,
  live = false,
  warm = false,
}: {
  done: number
  live?: boolean
  warm?: boolean
}) {
  return (
    <View
      accessibilityLabel={`${done} of 4 steps done, ${PRIVACY_STEPS[done] ?? "Closed"} next`}
      accessible
      className="flex-row"
      testID="privacy-steps"
    >
      {/* Connectors sit behind the circles, centre to centre. */}
      <View className="absolute top-[10px] right-[12.5%] left-[12.5%] flex-row">
        {PRIVACY_STEPS.slice(1).map((label, index) => (
          <View
            className={cn("h-[2px] flex-1", index < done ? "bg-primary" : "bg-border")}
            key={label}
          />
        ))}
      </View>
      {PRIVACY_STEPS.map((label, index) => {
        const finished = index < done
        const now = index === done
        return (
          <View className="flex-1 items-center gap-[6px]" key={label}>
            <View
              className={cn(
                "size-[22px] items-center justify-center rounded-full border-2",
                finished
                  ? "border-primary bg-primary"
                  : now
                    ? cn(
                        live ? "bg-primary" : "bg-card",
                        warm ? "border-tint-warm-foreground" : "border-primary"
                      )
                    : "border-border bg-surface-raised"
              )}
            >
              {finished ? (
                <Icon className="size-[12px] text-primary-foreground" name="Check" />
              ) : null}
            </View>
            <Text
              className={cn("text-center", now ? "text-foreground" : "text-muted-foreground")}
              variant="caption"
            >
              {label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/** The request reference with a copy action ("Copied" for two seconds). */
export function PrivacyReference({ id, raised = false }: { id: string; raised?: boolean }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <Pressable
      accessibilityLabel={`Copy reference ${id}`}
      accessibilityRole="button"
      className={cn(
        "min-h-[48px] flex-row items-center gap-[10px] rounded-[12px] px-[12px] py-[8px]",
        raised ? "bg-card" : "bg-surface-raised"
      )}
      haptic
      onPress={() => {
        Clipboard.setString(id)
        setCopied(true)
      }}
      testID="privacy-reference"
    >
      <View className="min-w-0 flex-1 gap-[1px]">
        <Text className="text-muted-foreground" variant="caption">
          {copied ? "Copied" : "Reference"}
        </Text>
        <Text className="font-mono text-[12px] font-semibold text-foreground" numberOfLines={1}>
          {id}
        </Text>
      </View>
      <Icon className="size-[18px] text-primary" name={copied ? "Check" : "Copy"} />
    </Pressable>
  )
}
