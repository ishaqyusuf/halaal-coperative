# 02 - Refresh Auth, Bootstrap, Role Switcher, And Bottom Tabs

**What to build:** Sign-in, app bootstrap, workspace switching, and role tab navigation feel polished and production-safe while preserving signed mobile auth, secure session storage, and the existing Expo Router route groups.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit.

**Status:** done

- [x] Sign-in presents a warm branded first screen with cooperative code, email, password, clear validation/error states, submit state, and a focused white bottom-sheet form.
- [x] Development shortcuts remain visibly development-only and are hidden or unavailable in production mode.
- [x] Bootstrap/loading states communicate tenant, session, and role resolution calmly without exposing mock finance state as production data.
- [x] Users with both member and staff access can switch workspaces through a clear role switcher that keeps the current operating context visible.
- [x] Member and admin bottom tabs use five or fewer destinations, fit labels on compact phones, and keep tab icons and labels accessible.
