import { Icon } from "@/components/ui/icon"
import { useEffect, useState } from "react"
import { Keyboard, Pressable, View } from "react-native"

export function ListCreateFab({
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  accessibilityLabel: string
  disabled?: boolean
  onPress: () => void
}) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(
    Keyboard.isVisible()
  )

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true)
    )
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false)
    )

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  if (isKeyboardVisible) return null

  return (
    <View
      className="absolute right-5 bottom-5"
      pointerEvents="box-none"
      style={{
        bottom: 20,
        elevation: 12,
        position: "absolute",
        right: 20,
        zIndex: 12,
      }}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className="h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary/90 disabled:opacity-50"
        disabled={disabled}
        onPress={onPress}
      >
        <Icon className="size-md text-primary-foreground" name="Plus" />
      </Pressable>
    </View>
  )
}
