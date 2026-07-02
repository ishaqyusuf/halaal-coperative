import { SectionCard } from "@/components/app/section-card";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { detailSections } from "@/data/mobile-template";
import { useColors } from "@/hooks/use-color";
import { ScrollView, View } from "react-native";

type DetailKey = keyof typeof detailSections;

export function DetailListScreen({ detailKey }: { detailKey: DetailKey }) {
  const colors = useColors();
  const section = detailSections[detailKey];

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            {section.title}
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {section.subtitle}
          </Text>
        </View>

        <SectionCard icon="ClipboardList" title="Starter workflow">
          <View className="gap-3">
            {section.rows.map((row) => (
              <View className="flex-row items-center gap-3" key={row}>
                <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                  <Icon name="Check" className="size-sm text-success" />
                </View>
                <Text className="flex-1 text-sm text-foreground">{row}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeArea>
  );
}
