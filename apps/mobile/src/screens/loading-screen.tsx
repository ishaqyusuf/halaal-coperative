import { SafeArea } from "@/components/safe-area";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-color";
import { ActivityIndicator, View } from "react-native";

export function LoadingScreen() {
  const colors = useColors();

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color={colors.primary} />
        <Text className="text-sm text-muted-foreground">Preparing app</Text>
      </View>
    </SafeArea>
  );
}
