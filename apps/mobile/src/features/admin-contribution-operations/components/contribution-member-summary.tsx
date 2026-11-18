import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

/** The member a form acts on: avatar, name and one line of context. */
export function ContributionMemberSummary({
  detail,
  name,
}: {
  detail: string
  name: string
}) {
  return (
    <Elevated className="rounded-[18px] bg-card" radius={18}>
      <View className="flex-row items-center gap-[12px] px-[14px] py-[12px]">
        <TintedAvatar name={name} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold" numberOfLines={1} variant="body">
            {name}
          </Text>
          <Text className="text-muted-foreground" numberOfLines={1} variant="small">
            {detail}
          </Text>
        </View>
      </View>
    </Elevated>
  )
}
