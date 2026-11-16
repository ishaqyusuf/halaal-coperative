import { create } from "zustand"

/**
 * Whether the floating tab dock is sunk by scroll. Written by the focused
 * screen's scroll (AppList / ScreenShell via useBottomDockScroll), read by
 * DockTabBar and the search footer so they move together (animateDock).
 */
export const useDockVisibilityStore = create<{
  hidden: boolean
  setHidden: (hidden: boolean) => void
}>((set) => ({
  hidden: false,
  setHidden: (hidden) => set((state) => (state.hidden === hidden ? state : { hidden })),
}))
