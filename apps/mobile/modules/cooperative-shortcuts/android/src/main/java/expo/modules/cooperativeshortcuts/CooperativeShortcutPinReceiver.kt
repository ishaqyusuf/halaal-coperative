package expo.modules.cooperativeshortcuts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutManager
import android.os.Build

/**
 * Unexported receiver for the launcher's pin-approval PendingIntent. A late
 * approval for an id that logout or an account change already deactivated is
 * disabled immediately; it never reactivates the shortcut.
 */
class CooperativeShortcutPinReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_SHORTCUT_ID) ?: return
    if (!CooperativeShortcutRegistry.isValidId(id) || Build.VERSION.SDK_INT < 26) return
    try {
      if (CooperativeShortcutRegistry.isActive(context, id)) {
        CooperativeShortcutRegistry.recordObserved(context, id)
        CooperativeShortcutsModule.notifyPinObserved(id)
      } else {
        context.getSystemService(ShortcutManager::class.java)?.disableShortcuts(
          listOf(id),
          CooperativeShortcutRegistry.DEFAULT_DISABLED_MESSAGE
        )
      }
    } catch (_: RuntimeException) {
      // The JS reconciler disables unknown pinned ids on the next start.
    }
  }

  companion object {
    const val EXTRA_SHORTCUT_ID = "expo.modules.cooperativeshortcuts.SHORTCUT_ID"
  }
}
