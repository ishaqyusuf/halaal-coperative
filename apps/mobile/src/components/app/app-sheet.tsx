import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import {
  type AppSheetPresentation,
  type AppSheetVariant,
  resolveAppSheetPresentation,
} from "@/lib/app-sheet-rule"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { useWindowDimensions, View } from "react-native"

/** Floating body padding; the full-screen shell supplies its own. */
const FLOATING_BODY_CLASS = "gap-[16px] px-[20px] pt-[4px] pb-[20px]"

export type AppSheetProps = {
  visible: boolean
  onClose: () => void
  onDismissed?: () => void
  title?: string
  children: ReactNode
  /**
   * - `form`: has inputs → always full screen (X, centred title, docked footer).
   * - `auto` (default): read-only → floating while it fits half the window,
   *   otherwise it expands into the full-screen presentation.
   * - `confirm` / `picker`: always floating.
   */
  variant?: AppSheetVariant
  /** Docked actions; ride the keyboard in the form presentation. */
  footer?: ReactNode
  /** Form only: confirm before discarding edits. */
  dirty?: boolean
  isSubmitting?: boolean
  /** Form only: right header text such as "1 of 2". */
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
  dirty,
  dismissible = true,
  footer,
  headerTrailing,
  isSubmitting,
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions()
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)
  const [presentation, setPresentation] =
    useState<AppSheetPresentation | null>(null)
  const needsMeasurement = variant === "auto"

  // Every open starts fresh: measure first, then decide.
  useEffect(() => {
    if (!visible) return
    setMeasuredHeight(null)
    setPresentation(null)
  }, [visible])

  const decided = resolveAppSheetPresentation({
    contentHeight: measuredHeight,
    previous: presentation,
    titled: Boolean(title),
    variant,
    windowHeight,
  })

  useEffect(() => {
    if (visible && decided && decided !== presentation) setPresentation(decided)
  }, [decided, presentation, visible])

  const onMeasure = useCallback((height: number) => {
    const rounded = Math.ceil(height)
    setMeasuredHeight((current) =>
      current !== null && Math.abs(current - rounded) <= 1 ? current : rounded
    )
  }, [])

  const active = presentation ?? decided
  const measuring = visible && needsMeasurement && active === null

  return (
    <>
      {measuring ? (
        // Off-screen, invisible measurement of the floating layout. Kept
        // out of the accessibility tree; it unmounts once measured.
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{
            left: 0,
            opacity: 0,
            position: "absolute",
            top: windowHeight * 2,
            width: windowWidth - 16,
          }}
        >
          <View onLayout={(event) => onMeasure(event.nativeEvent.layout.height)}>
            <View className={FLOATING_BODY_CLASS}>{children}</View>
            {footer}
          </View>
        </View>
      ) : null}
      <FloatingBottomSheet
        accessibilityLabel={accessibilityLabel ?? title}
        dismissible={dismissible}
        footer={footer}
        onBackPress={onBackPress}
        onClose={onClose}
        onDismissed={active === "floating" ? onDismissed : undefined}
        overlay={overlay}
        overlayActive={overlayActive}
        presentation="large"
        scrollable="auto"
        showCloseButton={variant !== "confirm"}
        title={title}
        visible={visible && active === "floating"}
      >
        <View
          className={FLOATING_BODY_CLASS}
          // Content that grows after opening (late data) re-measures here
          // and expands into the full-screen presentation past half height.
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
        dirty={variant === "form" ? dirty : false}
        footer={footer}
        headerTrailing={headerTrailing}
        isSubmitting={isSubmitting}
        onBack={onBack}
        onClose={onClose}
        onDismissed={active === "fullscreen" ? onDismissed : undefined}
        overlay={overlay}
        overlayActive={overlayActive}
        title={title ?? ""}
        visible={visible && active === "fullscreen"}
      >
        {children}
      </FullScreenFormSheet>
    </>
  )
}
