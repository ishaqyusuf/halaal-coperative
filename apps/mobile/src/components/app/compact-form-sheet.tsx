import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { BackHandler, Keyboard, TextInput, View } from "react-native"

function dismissKeyboardAndBlur() {
  TextInput.State.currentlyFocusedInput()?.blur()
  Keyboard.dismiss()
}

export function CompactFormSheet({
  children,
  dirty = false,
  footer,
  isSubmitting = false,
  onClose,
  onDismissed,
  overlay,
  overlayActive = false,
  title,
  visible,
}: {
  children: ReactNode
  dirty?: boolean
  footer?: ReactNode
  isSubmitting?: boolean
  onClose: () => void
  onDismissed?: () => void
  overlay?: ReactNode
  overlayActive?: boolean
  title: string
  visible: boolean
}) {
  const [isDiscardConfirmationVisible, setIsDiscardConfirmationVisible] =
    useState(false)

  const requestClose = useCallback(() => {
    if (isSubmitting || overlayActive) return

    if (!dirty) {
      dismissKeyboardAndBlur()
      onClose()
      return
    }

    setIsDiscardConfirmationVisible(true)
  }, [dirty, isSubmitting, onClose, overlayActive])

  const confirmDiscard = () => {
    dismissKeyboardAndBlur()
    onClose()
  }

  const keepEditing = () => {
    setIsDiscardConfirmationVisible(false)
  }

  useEffect(() => {
    if (!visible || overlayActive) return

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isDiscardConfirmationVisible) {
          keepEditing()
          return true
        }
        requestClose()
        return true
      }
    )

    return () => subscription.remove()
  }, [isDiscardConfirmationVisible, overlayActive, requestClose, visible])

  return (
    <FloatingBottomSheet
      accessibilityLabel={
        isDiscardConfirmationVisible ? "Discard changes?" : title
      }
      dismissible={
        !isDiscardConfirmationVisible &&
        !dirty &&
        !isSubmitting &&
        !overlayActive
      }
      overlayActive={overlayActive}
      footer={
        isDiscardConfirmationVisible ? (
          <View className="flex-row gap-2 px-5 pt-3 pb-5">
            <Button
              className="h-11 flex-1"
              onPress={keepEditing}
              variant="outline"
            >
              <Text>Keep editing</Text>
            </Button>
            <Button
              className="h-11 flex-1"
              onPress={confirmDiscard}
              variant="destructive"
            >
              <Icon
                className="size-base text-destructive-foreground"
                name="Trash2"
              />
              <Text>Close form</Text>
            </Button>
          </View>
        ) : (
          footer
        )
      }
      header={
        isDiscardConfirmationVisible ? undefined : (
          <View className="flex-row items-center gap-3 px-5 pt-5">
            <Text
              accessibilityRole="header"
              className="min-w-0 flex-1 text-xl font-extrabold tracking-tight text-foreground"
            >
              {title}
            </Text>
            <Button
              accessibilityLabel={`Close ${title}`}
              disabled={isSubmitting || overlayActive}
              onPress={requestClose}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>
        )
      }
      hideHandle
      keyboardExpandable={!isDiscardConfirmationVisible}
      onClose={onClose}
      onDismissed={() => {
        setIsDiscardConfirmationVisible(false)
        onDismissed?.()
      }}
      overlay={isDiscardConfirmationVisible ? undefined : overlay}
      presentation="compact"
      scrollable="auto"
      visible={visible}
    >
      {isDiscardConfirmationVisible ? (
        <View className="gap-2 px-5 pt-5 pb-4">
          <Text
            accessibilityRole="header"
            className="text-xl font-extrabold tracking-tight text-foreground"
          >
            Discard changes?
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Closing the form will discard its unsent changes. Keep editing to
            continue where you left off.
          </Text>
        </View>
      ) : (
        <View className="gap-4 px-5 pt-4 pb-6">{children}</View>
      )}
    </FloatingBottomSheet>
  )
}
