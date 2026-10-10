import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { View } from "react-native"

type ModalAccessibilityContextValue = {
  floatingSheetVisible: boolean
  registerFloatingSheet: () => () => void
}

const ModalAccessibilityContext =
  createContext<ModalAccessibilityContextValue>({
    floatingSheetVisible: false,
    registerFloatingSheet: () => () => undefined,
  })

export function ModalAccessibilityProvider({
  children,
}: {
  children: ReactNode
}) {
  const [floatingSheetCount, setFloatingSheetCount] = useState(0)
  const registerFloatingSheet = useCallback(() => {
    setFloatingSheetCount((currentCount) => currentCount + 1)

    let registered = true
    return () => {
      if (!registered) return
      registered = false
      setFloatingSheetCount((currentCount) => Math.max(0, currentCount - 1))
    }
  }, [])
  const value = useMemo(
    () => ({
      floatingSheetVisible: floatingSheetCount > 0,
      registerFloatingSheet,
    }),
    [floatingSheetCount, registerFloatingSheet]
  )

  return (
    <ModalAccessibilityContext.Provider value={value}>
      {children}
    </ModalAccessibilityContext.Provider>
  )
}

export function AppAccessibilityBackground({
  children,
}: {
  children: ReactNode
}) {
  const { hideTabBar: fullScreenFormVisible } =
    useFullScreenFormVisibility()
  const { floatingSheetVisible } = useModalAccessibility()
  const hidden = fullScreenFormVisible || floatingSheetVisible

  return (
    <View
      aria-hidden={hidden}
      accessibilityElementsHidden={hidden}
      className="flex-1"
      collapsable={false}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      nativeID="app-accessibility-background"
      testID={hidden ? "app-background-hidden" : "app-background-visible"}
    >
      {children}
    </View>
  )
}

export function useModalAccessibility() {
  return useContext(ModalAccessibilityContext)
}
