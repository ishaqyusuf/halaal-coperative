import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

export function LivingCooperativeMotif({
  hideForLargeText,
  identityMark,
}: {
  hideForLargeText: boolean
  identityMark: string
}) {
  const colors = useColors()

  if (hideForLargeText) return null

  return (
    <View
      accessible={false}
      className="absolute inset-0"
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View className="bg-brand-contrast absolute -top-16 -right-20 size-56 rounded-full opacity-55" />
      <View className="bg-brand absolute top-3 -right-14 size-36 rounded-full opacity-35" />

      <View className="absolute top-20 -right-5 h-[255px] w-[226px]">
        <Svg height="100%" viewBox="0 0 226 255" width="100%">
          <Path
            d="M31 226c36-14 57-42 69-80 12-39 35-73 75-102"
            fill="none"
            stroke={colors.brandSurfaceForeground}
            strokeLinecap="round"
            strokeOpacity={0.38}
            strokeWidth={2}
          />
          <Path
            d="M31 226 90 212m10-66 65 67m-65-67-63-27m99-42 54 44m-54-44-48-31"
            fill="none"
            stroke={colors.brandSurfaceForeground}
            strokeLinecap="round"
            strokeOpacity={0.3}
            strokeWidth={1.5}
          />
          <Path
            d="M118 95c17-26 42-33 66-28-8 26-29 42-66 28Z"
            fill={colors.brandWarm}
          />
          <Path
            d="M92 138c-25-18-43-17-60-4 15 22 36 27 60 4Z"
            fill={colors.brand}
          />
          <Path
            d="M143 65c-10-25-29-35-50-32 4 24 20 38 50 32Z"
            fill={colors.accent}
          />
          <Path
            d="M99 176c21-21 43-24 63-15-11 24-31 35-63 15Z"
            fill={colors.brandVivid}
          />
          <Circle cx={31} cy={226} fill={colors.brandWarm} r={13} />
          <Circle cx={90} cy={212} fill={colors.accent} r={15} />
          <Circle cx={165} cy={213} fill={colors.brandVivid} r={12} />
          <Circle cx={190} cy={121} fill={colors.brand} r={13} />
          <Circle cx={37} cy={119} fill={colors.brandContrast} r={14} />
          <Circle cx={100} cy={146} fill={colors.background} r={29} />
        </Svg>

        <View className="absolute top-[117px] left-[71px] size-[58px] items-center justify-center rounded-full">
          <Text
            className="text-xl font-black text-foreground"
            maxFontSizeMultiplier={1}
          >
            {identityMark}
          </Text>
        </View>
      </View>
    </View>
  )
}
