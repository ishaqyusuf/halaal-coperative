import { createContext, type ReactNode, useContext } from "react"

const BottomSheetInputContext = createContext<{
  enabled: boolean
  onInputFocus?: (nativeTarget: number) => void
}>({ enabled: false })

export function BottomSheetInputProvider({
  children,
  onInputFocus,
}: {
  children: ReactNode
  onInputFocus?: (nativeTarget: number) => void
}) {
  return (
    <BottomSheetInputContext.Provider value={{ enabled: true, onInputFocus }}>
      {children}
    </BottomSheetInputContext.Provider>
  )
}

export function useBottomSheetInput() {
  return useContext(BottomSheetInputContext).enabled
}

export function useBottomSheetInputFocus() {
  return useContext(BottomSheetInputContext).onInputFocus
}
