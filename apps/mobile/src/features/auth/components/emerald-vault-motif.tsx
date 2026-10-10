import { View } from "react-native"

export function EmeraldVaultMotif() {
  return (
    <View
      accessible={false}
      className="absolute -top-1 -right-24 h-[310px] w-[286px]"
      importantForAccessibility="no"
      pointerEvents="none"
    >
      <View className="border-brand-surface-foreground/25 absolute top-0 right-0 h-[296px] w-[252px] rounded-t-full border-2" />
      <View className="bg-brand-surface-foreground/5 absolute top-6 right-4 h-[280px] w-[220px] rounded-t-full" />
      <View className="bg-brand-surface-foreground/5 absolute top-12 right-10 h-[254px] w-[172px] rounded-t-full" />
      <View className="bg-brand-warm absolute top-[112px] right-0 h-[226px] w-[146px] rounded-t-full opacity-95" />
    </View>
  )
}
