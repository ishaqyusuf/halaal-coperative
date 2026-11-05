package expo.modules.cooperativeshortcuts

import android.content.Context

/**
 * App-private native bookkeeping. It holds opaque shortcut ids only: the
 * account/cooperative mapping lives in JS SecureStore and is erased on logout.
 * Writes use commit() so a later crash cannot lose a deactivation.
 */
internal object CooperativeShortcutRegistry {
  private const val PREFS = "halaalvest_cooperative_shortcuts_v1"
  private const val ACTIVE = "active_ids"
  private const val OBSERVED = "observed_ids"
  private val ID_PATTERN = Regex("^cs1-[0-9a-f]{32}$")

  const val DEFAULT_DISABLED_MESSAGE = "Sign in to HalaalVest to add this shortcut again."

  fun isValidId(id: String) = ID_PATTERN.matches(id)

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun read(context: Context, key: String): Set<String> =
    prefs(context).getStringSet(key, emptySet())?.toSet() ?: emptySet()

  private fun write(context: Context, key: String, ids: Set<String>) {
    check(prefs(context).edit().putStringSet(key, ids).commit()) {
      "Shortcut bookkeeping could not be saved."
    }
  }

  @Synchronized
  fun isActive(context: Context, id: String) = read(context, ACTIVE).contains(id)

  @Synchronized
  fun activate(context: Context, id: String) {
    write(context, ACTIVE, read(context, ACTIVE) + id)
  }

  @Synchronized
  fun deactivate(context: Context, ids: Collection<String>) {
    write(context, ACTIVE, read(context, ACTIVE) - ids.toSet())
    write(context, OBSERVED, read(context, OBSERVED) - ids.toSet())
  }

  @Synchronized
  fun recordObserved(context: Context, id: String) {
    write(context, OBSERVED, read(context, OBSERVED) + id)
  }

  @Synchronized
  fun consumeObserved(context: Context): List<String> {
    val observed = read(context, OBSERVED)
    write(context, OBSERVED, emptySet())
    return observed.filter { isActive(context, it) }
  }
}
