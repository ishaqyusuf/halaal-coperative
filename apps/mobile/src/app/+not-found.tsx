import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-color";
import { Link } from "expo-router";
import { View } from "react-native";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-center text-3xl font-black text-foreground">
          Screen not found
        </Text>
        <Link asChild href="/">
          <Button>
            <Text>Return home</Text>
          </Button>
        </Link>
      </View>
    </SafeArea>
  );
}
