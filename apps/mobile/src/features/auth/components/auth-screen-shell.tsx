import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { EmeraldVaultMotif } from "@/features/auth/components/emerald-vault-motif"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Image, Pressable, useWindowDimensions, View } from "react-native"

const halaalvestLogo = require("../../../../assets/icons/app-icon.png")

export function AuthScreenShell({
  backLabel = "Back to sign in",
  children,
  onBack,
  stepNumber,
  title,
}: {
  backLabel?: string
  children: React.ReactNode
  onBack?: () => void
  stepNumber: 1 | 2 | 3
  title: string
}) {
  const router = useRouter()
  const largeTextLayout = useLargeTextLayout()
  const { height } = useWindowDimensions()
  const stackedHeader = largeTextLayout || stepNumber > 1

  return (
    <SafeArea className="bg-brand-surface">
      <ScreenStatusBar tone="brand" />
      <AppKeyboardAwareScrollView
        bottomOffset={224}
        className="bg-brand-surface"
        contentContainerClassName="flex-grow bg-brand-surface"
        contentContainerStyle={{ minHeight: height }}
      >
        <View
          className={cn(
            "bg-brand-surface relative overflow-hidden px-6 pt-5",
            largeTextLayout ? "min-h-[176px] pb-8" : "min-h-[320px] pb-10"
          )}
        >
          {largeTextLayout ? null : <EmeraldVaultMotif />}
          <Pressable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            className="border-brand-surface-foreground/20 bg-brand-surface-foreground/5 h-11 w-11 items-center justify-center self-start rounded-full border active:opacity-80"
            onPress={onBack ?? (() => router.back())}
          >
            <Icon
              className="text-brand-surface-foreground size-base"
              name="ArrowLeft"
            />
          </Pressable>

          <View
            className={cn(
              "flex-row items-center gap-3",
              largeTextLayout ? "mt-7" : "mt-9"
            )}
          >
            <View className="bg-brand-surface-foreground size-11 overflow-hidden rounded-[14px]">
              <Image
                accessible={false}
                className="size-full"
                resizeMode="cover"
                source={halaalvestLogo}
              />
            </View>
            <Text
              className="text-brand-surface-foreground min-w-0 flex-1 text-lg font-black tracking-[-0.45px]"
              maxFontSizeMultiplier={1.35}
              numberOfLines={2}
            >
              HalaalVest
            </Text>
          </View>

          {largeTextLayout ? null : (
            <Text
              accessibilityLabel="Find your way back in"
              className="text-brand-surface-foreground mt-10 max-w-[250px] text-[34px] leading-[34px] font-black tracking-[-1.5px]"
              maxFontSizeMultiplier={1.25}
            >
              Find your way{"\n"}
              <Text className="text-brand-warm text-[34px] leading-[34px] font-black tracking-[-1.5px]">
                back in.
              </Text>
            </Text>
          )}
        </View>

        <View className="-mt-6 flex-1 rounded-t-[34px] border-t border-border/60 bg-background px-6 pt-8 pb-6">
          <View
            className={cn(
              "mb-7 gap-5",
              stackedHeader
                ? "items-start"
                : "flex-row items-end justify-between"
            )}
          >
            <Text
              accessibilityRole="header"
              className={cn(
                "font-black tracking-[-1px] text-foreground",
                stackedHeader
                  ? "w-full text-[28px] leading-[36px]"
                  : "max-w-[260px] text-[32px] leading-[34px]"
              )}
              maxFontSizeMultiplier={largeTextLayout ? 1.25 : 1.5}
              numberOfLines={2}
            >
              {title}
            </Text>

            <View
              accessibilityLabel={`Step ${stepNumber} of 3`}
              className="flex-row items-center gap-1.5"
            >
              {[1, 2, 3].map((step) => (
                <View
                  className={cn(
                    "h-1 w-5 rounded-full",
                    step <= stepNumber ? "bg-brand" : "bg-muted"
                  )}
                  key={step}
                />
              ))}
              <Text
                className="ml-1 text-xs font-bold text-muted-foreground"
                maxFontSizeMultiplier={1.25}
                numberOfLines={1}
              >
                {stepNumber} of 3
              </Text>
            </View>
          </View>

          <View className="flex-1">{children}</View>
        </View>
      </AppKeyboardAwareScrollView>
    </SafeArea>
  )
}
