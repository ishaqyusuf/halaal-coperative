import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import {
  type AppSheetPresentation,
  type AppSheetVariant,
  resolveAppSheetPresentation,
} from "@/lib/app-sheet-rule"
import { cn } from "@/lib/utils"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useWindowDimensions, View } from "react-native"

/** The floating present/exit animation (300ms) plus a frame of slack. */
const FLOAT_SETTLE_MS = 360
const FLOAT_EXIT_MS = 320

/** Floating body padding; the full-screen shell supplies its own. */
const FLOATING_BODY_CLASS = "gap-[16px] px-[20px] pt-[4px] pb-[20px]"

export type AppSheetProps = {
  visible: boolean
  onClose: () => void
  onDismissed?: () => void
  title?: string
  /** Heading used only after an untitled sheet expands. */
  expandedTitle?: string
  children: ReactNode
  /** Remount the full-screen scroll position when a flow changes steps. */
  contentKey?: string
  contentClassName?: string
  /**
   * - `form`: has inputs → always full screen (X, centred title, docked footer).
   * - `auto` (default): read-only → floating while it fits half the window,
   *   otherwise it expands into the full-screen presentation.
   * - `confirm` / `picker`: always floating.
   */
  variant?: AppSheetVariant
  /** Known lower bound for the auto body and docked actions, in points. */
  minimumContentHeight?: number
  /** Docked actions; ride the keyboard in the form presentation. */
  footer?: ReactNode
  /** Add the floating sheet's action gutters around its fixed footer. */
  insetFloatingFooter?: boolean
  /** Form only: confirm before discarding edits. */
  dirty?: boolean
  isSubmitting?: boolean
  /** Form only: right header text such as "1 of 2". */
  headerOnCard?: boolean
  headerTrailing?: ReactNode
  /** Form only: back chevron for a later step. */
  onBack?: () => void
  overlay?: ReactNode
  overlayActive?: boolean
  accessibilityLabel?: string
  /** Floating only: false for consequential confirms (no swipe/backdrop). */
  dismissible?: boolean
  onBackPress?: () => void
}

/**
 * The one sheet API (ADR-20261116 §2). Build new surfaces on this instead
 * of FloatingBottomSheet / FullScreenFormSheet / CompactFormSheet directly;
 * those stay exported only until the screen threads migrate.
 */
export function AppSheet({
  accessibilityLabel,
  children,
  contentClassName,
  contentKey,
  dirty,
  dismissible = true,
  expandedTitle,
  footer,
  headerOnCard = false,
  headerTrailing,
  insetFloatingFooter = false,
  isSubmitting,
  minimumContentHeight,
  onBack,
  onBackPress,
  onClose,
  onDismissed,
  overlay,
  overlayActive,
  title,
  variant = "auto",
  visible,
}: AppSheetProps) {
  const { height: windowHeight } = useWindowDimensions()
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)
  const [footerHeight, setFooterHeight] = useState(0)
  const [presentation, setPresentation] = useState<AppSheetPresentation | null>(
    null
  )
  const startsFullscreen =
    variant === "auto" &&
    resolveAppSheetPresentation({
      contentHeight: minimumContentHeight ?? null,
      titled: Boolean(title),
      variant,
      windowHeight,
    }) === "fullscreen"
  const needsMeasurement = variant === "auto" && !startsFullscreen

  const openedAtRef = useRef(0)
  // Every open starts fresh: measure first, then decide.
  useEffect(() => {
    if (!visible) return
    openedAtRef.current = Date.now()
    setMeasuredHeight(null)
    setPresentation(null)
  }, [visible])

  const decided = startsFullscreen
    ? "fullscreen"
    : resolveAppSheetPresentation({
        contentHeight:
          measuredHeight === null
            ? null
            : measuredHeight +
              (insetFloatingFooter && footer ? footerHeight : 0),
        previous: presentation,
        titled: Boolean(title),
        variant,
        windowHeight,
      })

  const [expanding, setExpanding] = useState(false)
  useEffect(() => {
    if (!visible || !decided || decided === presentation) return
    if (decided === "fullscreen" && needsMeasurement) {
      // Floating → full screen: let the float settle, close it, then
      // present full screen. Presenting both gorhom portals in one frame
      // strands the floating sheet (found on device, 16 Nov 2026).
      const settle = Math.max(
        0,
        FLOAT_SETTLE_MS - (Date.now() - openedAtRef.current)
      )
      let swap: ReturnType<typeof setTimeout> | undefined
      const close = setTimeout(() => {
        setExpanding(true)
        swap = setTimeout(() => {
          setExpanding(false)
          setPresentation("fullscreen")
        }, FLOAT_EXIT_MS)
      }, settle)
      return () => {
        clearTimeout(close)
        if (swap) clearTimeout(swap)
      }
    }
    setPresentation(decided)
  }, [decided, needsMeasurement, presentation, visible])

  const onMeasure = useCallback((height: number) => {
    const rounded = Math.ceil(height)
    setMeasuredHeight((current) =>
      current !== null && Math.abs(current - rounded) <= 1 ? current : rounded
    )
  }, [])

  // Read-only content opens floating at once; its in-sheet measurement
  // expands it to full screen when it is taller than half the window.
  const active = startsFullscreen
    ? "fullscreen"
    : expanding
      ? "expanding"
      : (presentation ?? (variant === "auto" ? "floating" : decided))

  return (
    <>
      <FloatingBottomSheet
        accessibilityLabel={accessibilityLabel ?? title}
        dismissible={dismissible}
        footer={
          insetFloatingFooter && footer ? (
            <View
              className="px-[20px] pt-[12px] pb-[20px]"
              onLayout={(event) =>
                setFooterHeight(Math.ceil(event.nativeEvent.layout.height))
              }
            >
              {footer}
            </View>
          ) : (
            footer
          )
        }
        onBackPress={onBackPress}
        onClose={onClose}
        onDismissed={active === "floating" ? onDismissed : undefined}
        overlay={overlay}
        overlayActive={overlayActive}
        presentation="large"
        scrollable="auto"
        showCloseButton={variant !== "confirm" && !expandedTitle}
        title={title}
        visible={visible && active === "floating"}
      >
        <View
          className={cn(
            FLOATING_BODY_CLASS,
            insetFloatingFooter && "pt-[8px] pb-[4px]"
          )}
          // Measures the content; past half the window (now or after late
          // data arrives) the sheet expands into the full-screen presentation.
          onLayout={
            needsMeasurement
              ? (event) => onMeasure(event.nativeEvent.layout.height)
              : undefined
          }
        >
          {children}
        </View>
      </FloatingBottomSheet>
      <FullScreenFormSheet
        contentClassName={contentClassName}
        contentKey={contentKey}
        dirty={variant === "form" ? dirty : false}
        footer={footer}
        headerOnCard={headerOnCard}
        headerTrailing={headerTrailing}
        isSubmitting={isSubmitting}
        onBack={onBack}
        onClose={onClose}
        onDismissed={active === "fullscreen" ? onDismissed : undefined}
        overlay={overlay}
        overlayActive={overlayActive}
        title={title ?? expandedTitle ?? ""}
        visible={visible && active === "fullscreen"}
      >
        {children}
      </FullScreenFormSheet>
    </>
  )
}
