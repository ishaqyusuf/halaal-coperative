import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export function SubmissionSuccessSheet({
  description,
  onClose,
  title = "Request sent",
  visible,
}: {
  description: string
  onClose: () => void
  title?: string
  visible: boolean
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel={title}
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title={title}
      visible={visible}
      footer={
        <View className="px-5 pt-3 pb-5">
          <Button className="h-11 w-full" onPress={onClose}>
            <Text>Done</Text>
          </Button>
        </View>
      }
    >
      <View className="items-center gap-4 px-5 pt-3 pb-4">
        <View className="bg-success/10 h-16 w-16 items-center justify-center rounded-full">
          <Icon className="size-xl text-success" name="Check" />
        </View>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
      </View>
    </FloatingBottomSheet>
  )
}
