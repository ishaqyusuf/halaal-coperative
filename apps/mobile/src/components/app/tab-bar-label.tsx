import { Text } from "@/components/ui/text"

export function TabBarLabel({
  color,
  label,
}: {
  color: string
  label: string
}) {
  return (
    <Text
      className="text-[10px] leading-3 font-semibold"
      maxFontSizeMultiplier={1.1}
      numberOfLines={1}
      style={{ color }}
    >
      {label}
    </Text>
  )
}
