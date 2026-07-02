import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export function SectionCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <View className="gap-4 rounded-md border border-border bg-card p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-secondary">
          <Icon name={icon} className="size-base text-foreground" />
        </View>
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}
