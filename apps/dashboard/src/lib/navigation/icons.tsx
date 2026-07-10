import type { ReactNode, SVGProps } from "react"

type DashboardIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "key" | "ref"
>

function createIcon(path: ReactNode) {
  return function DashboardIcon(props: DashboardIconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
        {path}
      </svg>
    )
  }
}

export const HomeIcon = createIcon(
  <>
    <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
)

export const MembersIcon = createIcon(
  <>
    <path d="M8 11a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 20a4.5 4.5 0 019 0" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 20a3.5 3.5 0 017 0" strokeLinecap="round" strokeLinejoin="round" />
  </>,
)

export const FinanceIcon = createIcon(
  <>
    <rect x="4" y="5" width="16" height="14" rx="3" />
    <path d="M8 10h8" strokeLinecap="round" />
    <path d="M8 14h4" strokeLinecap="round" />
  </>,
)

export const ExperienceIcon = createIcon(
  <>
    <path d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z" />
    <path d="M4 9h16" strokeLinecap="round" />
    <path d="M8 14h3" strokeLinecap="round" />
  </>,
)

export const SettingsIcon = createIcon(
  <>
    <path d="M12 8.5A3.5 3.5 0 1112 15.5 3.5 3.5 0 0112 8.5z" />
    <path
      d="M19 12a7 7 0 00-.08-1l2.04-1.58-2-3.46-2.5 1a7.31 7.31 0 00-1.74-1l-.38-2.65h-4l-.38 2.65a7.31 7.31 0 00-1.74 1l-2.5-1-2 3.46L5.08 11A7 7 0 005 12c0 .34.03.67.08 1l-2.04 1.58 2 3.46 2.5-1c.54.42 1.12.76 1.74 1l.38 2.65h4l.38-2.65c.62-.24 1.2-.58 1.74-1l2.5 1 2-3.46L18.92 13c.05-.33.08-.66.08-1z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
)

export const NotificationIcon = createIcon(
  <>
    <path d="M12 4a4 4 0 00-4 4v2.5c0 .84-.28 1.66-.8 2.32L6 14.5h12l-1.2-1.68A3.98 3.98 0 0116 10.5V8a4 4 0 00-4-4z" />
    <path d="M10 18a2 2 0 004 0" strokeLinecap="round" />
  </>,
)

export const ReportsIcon = createIcon(
  <>
    <path d="M6 4h8l4 4v12H6z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 13h6" strokeLinecap="round" />
    <path d="M9 17h4" strokeLinecap="round" />
  </>,
)
