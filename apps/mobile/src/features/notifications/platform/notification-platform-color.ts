const RGB_THEME_COLOR =
  /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/

export function toNotificationPlatformColor(themeColor: string) {
  const match = RGB_THEME_COLOR.exec(themeColor)
  if (!match) {
    throw new Error("Notification colors must use an rgb theme token.")
  }

  const channels = match.slice(1).map(Number)
  if (channels.some((channel) => channel > 255)) {
    throw new Error("Notification color channels must be between 0 and 255.")
  }

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`
}
