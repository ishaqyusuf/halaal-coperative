import { useColorScheme } from "@/hooks/use-color";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react-native";
import type { ComponentType } from "react";
import { View } from "react-native";

type LucideProps = LucideIcons.LucideProps;
type IconThemeOverride = keyof typeof THEME | "";
const iconRegistry = LucideIcons as unknown as Record<
  string,
  ComponentType<LucideProps>
>;
export type IconProps = Omit<LucideProps, "size"> & {
  as?: ComponentType<LucideProps>;
  inverted?: boolean;
  name?: string;
  theme?: IconThemeOverride;
};

const iconSizes: Record<string, number> = {
  xs: 12,
  sm: 16,
  base: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 40,
};

function camelToken(value: string) {
  return value.replace(/-([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

function getClassToken(className: string, prefix: string) {
  return className
    .split(" ")
    .reverse()
    .find((item) => item.startsWith(prefix));
}

function resolveColor(className: string, scheme: "light" | "dark") {
  const textClass = getClassToken(className, "text-");
  const textToken = textClass?.slice(5);
  if (!textToken) return undefined;

  const [colorToken, opacityToken] = textToken.split("/");
  const themeKey = camelToken(colorToken ?? "") as keyof typeof THEME.light;
  const color = THEME[scheme][themeKey];
  if (!color) return undefined;

  const parsedOpacity = opacityToken ? Number(opacityToken) : undefined;
  const opacity =
    parsedOpacity === undefined || Number.isNaN(parsedOpacity)
      ? undefined
      : parsedOpacity > 1
        ? parsedOpacity / 100
        : parsedOpacity;

  return { color, opacity };
}

function resolveSize(className: string) {
  const sizeClass = getClassToken(className, "size-") ?? "size-base";
  const token = sizeClass.slice(5);
  if (token.startsWith("[") && token.endsWith("px]")) {
    return Number(token.replace(/[\[\]px]/g, "")) || iconSizes.base;
  }
  return iconSizes[token] ?? iconSizes.base;
}

export function Icon({
  as,
  className,
  color,
  inverted,
  name = "Circle",
  strokeWidth = 1.9,
  theme,
  ...props
}: IconProps) {
  const { colorScheme } = useColorScheme();
  const themeOverride =
    theme === "dark" || theme === "light" ? theme : undefined;
  const scheme = themeOverride ?? (inverted ? "dark" : colorScheme);
  const resolvedClassName = cn("text-foreground", className);
  const resolvedColor = resolveColor(resolvedClassName, scheme);
  const IconComponent = as ?? iconRegistry[name] ?? LucideIcons.Circle;
  const wrapperClassName = resolvedClassName
    .split(" ")
    .filter(
      (item) => !item.startsWith("text-") && !item.startsWith("size-"),
    )
    .join(" ");
  const icon = (
    <IconComponent
      color={resolvedColor?.color ?? color}
      opacity={resolvedColor?.opacity}
      size={resolveSize(resolvedClassName)}
      strokeWidth={strokeWidth}
      {...props}
    />
  );

  if (!wrapperClassName) return icon;

  return <View className={wrapperClassName}>{icon}</View>;
}
