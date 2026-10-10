import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type FullScreenFormVisibilityContextValue = {
  hideTabBar: boolean
  registerVisibleForm: () => () => void
}

const FullScreenFormVisibilityContext =
  createContext<FullScreenFormVisibilityContextValue>({
    hideTabBar: false,
    registerVisibleForm: () => () => undefined,
  })

export function FullScreenFormVisibilityProvider({
  children,
}: {
  children: ReactNode
}) {
  const [visibleFormCount, setVisibleFormCount] = useState(0)
  const registerVisibleForm = useCallback(() => {
    setVisibleFormCount((currentCount) => currentCount + 1)

    let registered = true
    return () => {
      if (!registered) return
      registered = false
      setVisibleFormCount((currentCount) => Math.max(0, currentCount - 1))
    }
  }, [])
  const value = useMemo(
    () => ({
      hideTabBar: visibleFormCount > 0,
      registerVisibleForm,
    }),
    [registerVisibleForm, visibleFormCount]
  )

  return (
    <FullScreenFormVisibilityContext.Provider value={value}>
      {children}
    </FullScreenFormVisibilityContext.Provider>
  )
}

export function useFullScreenFormVisibility() {
  return useContext(FullScreenFormVisibilityContext)
}
