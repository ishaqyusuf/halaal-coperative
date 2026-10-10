import { useColorScheme } from "@/hooks/use-color"
import { THEME } from "@/lib/theme"
import { cn } from "@/lib/utils"
import type { LucideProps } from "lucide-react-native"
import type { ComponentType } from "react"
import { View } from "react-native"

type IconThemeOverride = keyof typeof THEME | ""
export type IconProps = Omit<LucideProps, "size"> & {
  as?: ComponentType<LucideProps>
  inverted?: boolean
  name?: string
  theme?: IconThemeOverride
}

// Do not import the Lucide namespace here. Metro evaluates every re-export in
// that barrel during development, which adds thousands of modules to the
// Hermes heap. Explicit subpath imports keep the mobile icon surface bounded.
const iconRegistry: Record<string, ComponentType<LucideProps>> = {
  AlertCircle: require("lucide-react-native/dist/esm/icons/circle-alert")
    .default,
  AlertTriangle: require("lucide-react-native/dist/esm/icons/triangle-alert")
    .default,
  ArrowLeft: require("lucide-react-native/dist/esm/icons/arrow-left").default,
  ArrowRight: require("lucide-react-native/dist/esm/icons/arrow-right").default,
  ArrowUpRight: require("lucide-react-native/dist/esm/icons/arrow-up-right")
    .default,
  BadgeCheck: require("lucide-react-native/dist/esm/icons/badge-check").default,
  BadgeDollarSign:
    require("lucide-react-native/dist/esm/icons/badge-dollar-sign").default,
  Bell: require("lucide-react-native/dist/esm/icons/bell").default,
  BellOff: require("lucide-react-native/dist/esm/icons/bell-off").default,
  BellRing: require("lucide-react-native/dist/esm/icons/bell-ring").default,
  BriefcaseBusiness:
    require("lucide-react-native/dist/esm/icons/briefcase-business").default,
  Calendar: require("lucide-react-native/dist/esm/icons/calendar").default,
  CalendarClock: require("lucide-react-native/dist/esm/icons/calendar-clock")
    .default,
  ChartNoAxesCombined:
    require("lucide-react-native/dist/esm/icons/chart-no-axes-combined").default,
  Check: require("lucide-react-native/dist/esm/icons/check").default,
  ChevronLeft: require("lucide-react-native/dist/esm/icons/chevron-left")
    .default,
  ChevronRight: require("lucide-react-native/dist/esm/icons/chevron-right")
    .default,
  Circle: require("lucide-react-native/dist/esm/icons/circle").default,
  CircleAlert: require("lucide-react-native/dist/esm/icons/circle-alert")
    .default,
  CircleCheck: require("lucide-react-native/dist/esm/icons/circle-check")
    .default,
  CircleDollarSign:
    require("lucide-react-native/dist/esm/icons/circle-dollar-sign").default,
  CircleX: require("lucide-react-native/dist/esm/icons/circle-x").default,
  ClipboardCheck: require("lucide-react-native/dist/esm/icons/clipboard-check")
    .default,
  ClipboardList: require("lucide-react-native/dist/esm/icons/clipboard-list")
    .default,
  CloudCheck: require("lucide-react-native/dist/esm/icons/cloud-check").default,
  CreditCard: require("lucide-react-native/dist/esm/icons/credit-card").default,
  Download: require("lucide-react-native/dist/esm/icons/download").default,
  Delete: require("lucide-react-native/dist/esm/icons/delete").default,
  Eye: require("lucide-react-native/dist/esm/icons/eye").default,
  EyeOff: require("lucide-react-native/dist/esm/icons/eye-off").default,
  ExternalLink: require("lucide-react-native/dist/esm/icons/external-link")
    .default,
  FileCheck: require("lucide-react-native/dist/esm/icons/file-check").default,
  FileText: require("lucide-react-native/dist/esm/icons/file-text").default,
  Fingerprint: require("lucide-react-native/dist/esm/icons/fingerprint")
    .default,
  FolderCheck: require("lucide-react-native/dist/esm/icons/folder-check")
    .default,
  HandCoins: require("lucide-react-native/dist/esm/icons/hand-coins").default,
  Headphones: require("lucide-react-native/dist/esm/icons/headphones").default,
  History: require("lucide-react-native/dist/esm/icons/history").default,
  Home: require("lucide-react-native/dist/esm/icons/house").default,
  Info: require("lucide-react-native/dist/esm/icons/info").default,
  KeyRound: require("lucide-react-native/dist/esm/icons/key-round").default,
  Landmark: require("lucide-react-native/dist/esm/icons/landmark").default,
  LayoutDashboard:
    require("lucide-react-native/dist/esm/icons/layout-dashboard").default,
  LayoutGrid: require("lucide-react-native/dist/esm/icons/layout-grid").default,
  ListChecks: require("lucide-react-native/dist/esm/icons/list-checks").default,
  LockKeyhole: require("lucide-react-native/dist/esm/icons/lock-keyhole")
    .default,
  LoaderCircle: require("lucide-react-native/dist/esm/icons/loader-circle")
    .default,
  LogIn: require("lucide-react-native/dist/esm/icons/log-in").default,
  LogOut: require("lucide-react-native/dist/esm/icons/log-out").default,
  Mail: require("lucide-react-native/dist/esm/icons/mail").default,
  Menu: require("lucide-react-native/dist/esm/icons/menu").default,
  Monitor: require("lucide-react-native/dist/esm/icons/monitor").default,
  Moon: require("lucide-react-native/dist/esm/icons/moon").default,
  MessageCirclePlus:
    require("lucide-react-native/dist/esm/icons/message-circle-plus").default,
  MessageSquarePlus:
    require("lucide-react-native/dist/esm/icons/message-square-plus").default,
  MessageSquareReply:
    require("lucide-react-native/dist/esm/icons/message-square-reply").default,
  MessageSquareText:
    require("lucide-react-native/dist/esm/icons/message-square-text").default,
  MessagesSquare: require("lucide-react-native/dist/esm/icons/messages-square")
    .default,
  PackagePlus: require("lucide-react-native/dist/esm/icons/package-plus")
    .default,
  PackageSearch: require("lucide-react-native/dist/esm/icons/package-search")
    .default,
  PanelsTopLeft: require("lucide-react-native/dist/esm/icons/panels-top-left")
    .default,
  PieChart: require("lucide-react-native/dist/esm/icons/chart-pie").default,
  Plus: require("lucide-react-native/dist/esm/icons/plus").default,
  PlusCircle: require("lucide-react-native/dist/esm/icons/circle-plus").default,
  ReceiptText: require("lucide-react-native/dist/esm/icons/receipt-text")
    .default,
  RefreshCw: require("lucide-react-native/dist/esm/icons/refresh-cw").default,
  RotateCw: require("lucide-react-native/dist/esm/icons/rotate-cw").default,
  Search: require("lucide-react-native/dist/esm/icons/search").default,
  Send: require("lucide-react-native/dist/esm/icons/send").default,
  Settings: require("lucide-react-native/dist/esm/icons/settings").default,
  Share2: require("lucide-react-native/dist/esm/icons/share-2").default,
  Shield: require("lucide-react-native/dist/esm/icons/shield").default,
  ShieldAlert: require("lucide-react-native/dist/esm/icons/shield-alert")
    .default,
  ShieldCheck: require("lucide-react-native/dist/esm/icons/shield-check")
    .default,
  ShieldX: require("lucide-react-native/dist/esm/icons/shield-x").default,
  ShoppingBasket: require("lucide-react-native/dist/esm/icons/shopping-basket")
    .default,
  ShoppingBag: require("lucide-react-native/dist/esm/icons/shopping-bag")
    .default,
  SlidersHorizontal:
    require("lucide-react-native/dist/esm/icons/sliders-horizontal").default,
  Smartphone: require("lucide-react-native/dist/esm/icons/smartphone").default,
  Star: require("lucide-react-native/dist/esm/icons/star").default,
  Sun: require("lucide-react-native/dist/esm/icons/sun").default,
  Trash2: require("lucide-react-native/dist/esm/icons/trash-2").default,
  TriangleAlert: require("lucide-react-native/dist/esm/icons/triangle-alert")
    .default,
  User: require("lucide-react-native/dist/esm/icons/user").default,
  UserCheck: require("lucide-react-native/dist/esm/icons/user-check").default,
  UserPlus: require("lucide-react-native/dist/esm/icons/user-plus").default,
  UserRound: require("lucide-react-native/dist/esm/icons/user-round").default,
  UserRoundCheck: require("lucide-react-native/dist/esm/icons/user-round-check")
    .default,
  UserRoundPlus: require("lucide-react-native/dist/esm/icons/user-round-plus")
    .default,
  UserRoundX: require("lucide-react-native/dist/esm/icons/user-round-x").default,
  UserX: require("lucide-react-native/dist/esm/icons/user-x").default,
  Users: require("lucide-react-native/dist/esm/icons/users").default,
  UsersRound: require("lucide-react-native/dist/esm/icons/users-round").default,
  Wallet: require("lucide-react-native/dist/esm/icons/wallet").default,
  WalletCards: require("lucide-react-native/dist/esm/icons/wallet-cards")
    .default,
  WandSparkles: require("lucide-react-native/dist/esm/icons/wand-sparkles")
    .default,
  WifiOff: require("lucide-react-native/dist/esm/icons/wifi-off").default,
  X: require("lucide-react-native/dist/esm/icons/x").default,
  Zap: require("lucide-react-native/dist/esm/icons/zap").default,
}

const iconSizes: Record<string, number> = {
  xs: 12,
  sm: 16,
  base: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 40,
}

function camelToken(value: string) {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function getClassToken(className: string, prefix: string) {
  return className
    .split(" ")
    .reverse()
    .find((item) => item.startsWith(prefix))
}

function resolveColor(className: string, scheme: "light" | "dark") {
  const textClass = getClassToken(className, "text-")
  const textToken = textClass?.slice(5)
  if (!textToken) return undefined

  const [colorToken, opacityToken] = textToken.split("/")
  const themeKey = camelToken(colorToken ?? "") as keyof typeof THEME.light
  const color = THEME[scheme][themeKey]
  if (!color) return undefined

  const parsedOpacity = opacityToken ? Number(opacityToken) : undefined
  const opacity =
    parsedOpacity === undefined || Number.isNaN(parsedOpacity)
      ? undefined
      : parsedOpacity > 1
        ? parsedOpacity / 100
        : parsedOpacity

  return { color, opacity }
}

function resolveSize(className: string) {
  const sizeClass = getClassToken(className, "size-") ?? "size-base"
  const token = sizeClass.slice(5)
  if (token.startsWith("[") && token.endsWith("px]")) {
    return Number(token.replace(/[\[\]px]/g, "")) || iconSizes.base
  }
  return iconSizes[token] ?? iconSizes.base
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
  const { colorScheme } = useColorScheme()
  const themeOverride =
    theme === "dark" || theme === "light" ? theme : undefined
  const scheme = themeOverride ?? (inverted ? "dark" : colorScheme)
  const resolvedClassName = cn("text-foreground", className)
  const resolvedColor = resolveColor(resolvedClassName, scheme)
  const IconComponent = as ?? iconRegistry[name] ?? iconRegistry.Circle
  const wrapperClassName = resolvedClassName
    .split(" ")
    .filter((item) => !item.startsWith("text-") && !item.startsWith("size-"))
    .join(" ")
  const icon = (
    <IconComponent
      color={resolvedColor?.color ?? color}
      opacity={resolvedColor?.opacity}
      size={resolveSize(resolvedClassName)}
      strokeWidth={strokeWidth}
      {...props}
    />
  )

  if (!wrapperClassName) return icon

  return <View className={wrapperClassName}>{icon}</View>
}
