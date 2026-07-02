import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

const toneClass = {
  accent: "bg-accent",
  primary: "bg-primary",
  success: "bg-success",
};

const iconClass = {
  accent: "text-accent-foreground",
  primary: "text-primary-foreground",
  success: "text-success-foreground",
};

export function ServiceTile({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: keyof typeof toneClass;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="w-[23%] min-w-[76px] items-center gap-2 rounded-md p-2"
      haptic
      transition
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-md ${toneClass[tone]}`}
      >
        <Icon name={icon} className={`size-md ${iconClass[tone]}`} />
      </View>
      <Text className="text-center text-xs font-medium leading-4 text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
