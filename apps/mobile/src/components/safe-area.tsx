import { cn } from "@/lib/utils"
import type { StyleProp, ViewStyle } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export function SafeArea({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <SafeAreaView
      className={cn("flex-1", className)}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </SafeAreaView>
  )
}
