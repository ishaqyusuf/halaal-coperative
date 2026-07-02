import { Text } from "@/components/ui/text";
import { View } from "react-native";

export function StatCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-[148px] flex-1 gap-2 rounded-md border border-border bg-card p-4">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-xs leading-5 text-muted-foreground">{detail}</Text>
    </View>
  );
}
