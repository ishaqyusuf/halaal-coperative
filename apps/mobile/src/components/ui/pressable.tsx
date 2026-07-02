import { cn } from "@/lib/utils";
import { LinkProps, useRouter } from "expo-router";
import {
  Pressable as BasePressable,
  PressableProps as BasePressableProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-color";

function rgbToRgba(value: string, opacity: number) {
  const rgb = value.match(/\d+/g)?.slice(0, 3).join(", ");
  if (!rgb) return value;
  return `rgba(${rgb}, ${opacity})`;
}

type Props = BasePressableProps & {
  href?: LinkProps["href"];
  haptic?: boolean;
  noRipple?: boolean;
  rippleColor?: keyof ReturnType<typeof useColors>;
  rippleOpacity?: number;
  transition?: boolean;
  // onPress?: (event: GestureResponderEvent) => void;
};

export function Pressable({
  children,
  className,
  href,
  haptic,
  onPress,
  android_ripple,
  noRipple,
  rippleColor,
  rippleOpacity = 0.1,
  transition,
  ...props
}: Props) {
  const router = useRouter();
  const colors = useColors();
  return (
    <BasePressable
      className={cn(
        className,
        "overflow-hidden",
        !props.disabled && transition
          ? "active:scale-[0.98] transition-all"
          : undefined,
      )}
      onPress={(event) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
        if (href) router.push(href);
      }}
      android_ripple={
        noRipple || props.disabled
          ? undefined
          : {
            color: rgbToRgba(
              colors?.[rippleColor || "primary"],
              rippleOpacity,
            ),
              // color: "red",
              foreground: true,
              ...android_ripple,
            }
      }
      {...props}
    >
      {children}
    </BasePressable>
  );
}
