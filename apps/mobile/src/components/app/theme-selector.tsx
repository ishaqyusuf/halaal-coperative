import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColorScheme, useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { setThemeOverride, type ThemeOverride } from "@/lib/theme-preference"
import { cn } from "@/lib/utils"
import { useWindowDimensions, View, type TextStyle } from "react-native"

const CENTERED_LABEL_STYLE = {
  includeFontPadding: false,
  textAlignVertical: "center",
} satisfies TextStyle

const options: {
  icon: string
  iconOpticalClassName: string
  label: string
  value: ThemeOverride
}[] = [
  {
    icon: "Monitor",
    iconOpticalClassName: "translate-y-px",
    label: "System",
    value: "system",
  },
  {
    icon: "Sun",
    iconOpticalClassName: "translate-y-px",
    label: "Light",
    value: "light",
  },
  {
    icon: "Moon",
    iconOpticalClassName: "-translate-y-px",
    label: "Dark",
    value: "dark",
  },
]

export function ThemeSelector() {
  const { setColorScheme, themeOverride } = useColorScheme()
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const labelScale = resolveDisplayTextScale(fontScale)

  async function selectTheme(nextTheme: ThemeOverride) {
    setColorScheme(nextTheme)
    await setThemeOverride(nextTheme)
  }

  return (
    <View
      accessibilityLabel="App appearance"
      className={cn(
        "rounded-lg bg-secondary p-1",
        largeTextLayout ? "gap-1" : "flex-row"
      )}
    >
      {options.map((option) => {
        const isSelected = themeOverride === option.value

        return (
          <Pressable
            accessibilityLabel={`Use ${option.label.toLowerCase()} appearance`}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            className={cn(
              "min-h-11 rounded-lg px-2",
              largeTextLayout ? "w-full" : "flex-1",
              isSelected && "bg-card"
            )}
            haptic
            key={option.value}
            onPress={() => void selectTheme(option.value)}
            transition
          >
            <View
              className={cn(
                "min-h-11 flex-row items-center gap-2",
                largeTextLayout ? "justify-start px-2" : "justify-center"
              )}
            >
              <View
                className={cn(
                  "size-6 shrink-0 items-center justify-center",
                  option.iconOpticalClassName
                )}
              >
                <Icon
                  className={cn(
                    largeTextLayout ? "size-md" : "size-base",
                    isSelected ? "text-brand" : "text-muted-foreground"
                  )}
                  name={option.icon}
                />
              </View>
              <Text
                allowFontScaling={false}
                className={cn(
                  "font-semibold",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
                numberOfLines={1}
                style={[
                  CENTERED_LABEL_STYLE,
                  {
                    color: isSelected
                      ? colors.foreground
                      : colors.mutedForeground,
                    fontSize: largeTextLayout ? 12 * labelScale : 12,
                    lineHeight: largeTextLayout ? 18 * labelScale : 18,
                  },
                ]}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
