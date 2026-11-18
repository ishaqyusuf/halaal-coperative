import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { Image, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

const halaalvestLogo = require("../../../../assets/icons/app-icon.png")


/** Members joined into one cooperative: leaves and nodes around its mark. */
export function LivingCooperativeMotif({
  confirmed,
  identityMark,
}: {
  confirmed: boolean
  identityMark: string
}) {
  // The 02 hero palette: the motif always sits on the teal hero.
  const colors = useColors()
  const INK = colors.heroForeground
  const WARM = colors.brandWarm
  const TEAL = colors.heroAccent
  const CORAL = colors.brandVivid
  const DEEP = colors.heroEnd
  return (
    <View
      accessible={false}
      className="absolute top-[46px] -right-[26px] h-[190px] w-[168px] opacity-90"
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg height="100%" viewBox="0 0 226 255" width="100%">
        <Path
          d="M31 226c36-14 57-42 69-80 12-39 35-73 75-102"
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeOpacity={0.38}
          strokeWidth={2}
        />
        <Path
          d="M31 226 90 212m10-66 65 67m-65-67-63-27m99-42 54 44m-54-44-48-31"
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeOpacity={0.3}
          strokeWidth={1.5}
        />
        <Path d="M118 95c17-26 42-33 66-28-8 26-29 42-66 28Z" fill={WARM} />
        <Path d="M92 138c-25-18-43-17-60-4 15 22 36 27 60 4Z" fill={TEAL} />
        <Path
          d="M143 65c-10-25-29-35-50-32 4 24 20 38 50 32Z"
          fill={INK}
          fillOpacity={0.85}
        />
        <Path d="M99 176c21-21 43-24 63-15-11 24-31 35-63 15Z" fill={CORAL} />
        <Circle cx={31} cy={226} fill={WARM} r={13} />
        <Circle cx={90} cy={212} fill={INK} fillOpacity={0.85} r={15} />
        <Circle cx={165} cy={213} fill={CORAL} r={12} />
        <Circle cx={190} cy={121} fill={TEAL} r={13} />
        <Circle cx={37} cy={119} fill={DEEP} r={14} />
        <Circle cx={100} cy={146} fill={INK} fillOpacity={0.14} r={36} />
      </Svg>
      <View
        className={cn(
          "absolute top-[87px] left-[53px] size-[43px] items-center justify-center rounded-full",
          confirmed ? "bg-brand-warm" : "bg-hero-foreground"
        )}
      >
        {confirmed ? (
          <Text className="text-hero-mark-foreground" maxFontSizeMultiplier={1} variant="section">
            {identityMark}
          </Text>
        ) : (
          <Image
            accessible={false}
            className="size-[30px]"
            resizeMode="contain"
            source={halaalvestLogo}
          />
        )}
      </View>
    </View>
  )
}
