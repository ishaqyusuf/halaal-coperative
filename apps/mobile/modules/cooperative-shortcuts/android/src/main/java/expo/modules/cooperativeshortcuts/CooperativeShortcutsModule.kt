package expo.modules.cooperativeshortcuts

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.PersistableBundle
import android.os.UserManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.lang.ref.WeakReference

class CooperativeShortcutSpec : Record {
  @Field val id: String = ""
  @Field val shortLabel: String = ""
  @Field val longLabel: String = ""
  @Field val mark: String = ""
  @Field val uri: String = ""
  @Field val environment: String = "production"
  @Field val tenantId: String = ""
}

private val TENANT_ID_PATTERN = Regex("^[A-Za-z0-9_-]{1,64}$")
private const val EXTRA_TENANT_ID = "halaalvest.tenantId"
private const val EXTRA_MARK = "halaalvest.mark"

class CooperativeShortcutsModule : Module() {
  private fun context(): Context = requireNotNull(appContext.reactContext).applicationContext

  private fun manager(): ShortcutManager? =
    if (Build.VERSION.SDK_INT >= 26) context().getSystemService(ShortcutManager::class.java) else null

  override fun definition() = ModuleDefinition {
    Name("CooperativeShortcuts")
    Events("onPinObserved")

    OnCreate { instance = WeakReference(this@CooperativeShortcutsModule) }
    OnDestroy { if (instance?.get() === this@CooperativeShortcutsModule) instance = null }

    // ShortcutManager calls can block on binder IPC; AsyncFunction runs them
    // off the UI and JS threads.
    AsyncFunction("getSupport") {
      val ctx = context()
      when {
        Build.VERSION.SDK_INT < 26 -> "unsupported_os"
        !ctx.getSystemService(UserManager::class.java).isUserUnlocked -> "user_locked"
        manager()?.isRequestPinShortcutSupported != true -> "unsupported_launcher"
        else -> "supported"
      }
    }

    AsyncFunction("requestPin") { spec: CooperativeShortcutSpec ->
      val ctx = context()
      val manager = manager() ?: return@AsyncFunction "unsupported"
      if (!manager.isRequestPinShortcutSupported) return@AsyncFunction "unsupported"
      val info = buildShortcut(ctx, spec)
      val existing = manager.pinnedShortcuts.firstOrNull { it.id == spec.id }
      // Mark the id active before Android can deliver an approval for it.
      CooperativeShortcutRegistry.activate(ctx, spec.id)
      try {
        if (existing != null) {
          if (!existing.isEnabled) manager.enableShortcuts(listOf(spec.id))
          manager.updateShortcuts(listOf(info))
          if (existing.isEnabled) return@AsyncFunction "already_pinned"
        }
        val callback = Intent(ctx, CooperativeShortcutPinReceiver::class.java)
          .setPackage(ctx.packageName)
          .putExtra(CooperativeShortcutPinReceiver.EXTRA_SHORTCUT_ID, spec.id)
        val pendingIntent = PendingIntent.getBroadcast(
          ctx,
          spec.id.hashCode(),
          callback,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        if (manager.requestPinShortcut(info, pendingIntent.intentSender)) {
          "requested"
        } else {
          if (existing == null) CooperativeShortcutRegistry.deactivate(ctx, listOf(spec.id))
          "rejected"
        }
      } catch (error: RuntimeException) {
        if (existing == null) CooperativeShortcutRegistry.deactivate(ctx, listOf(spec.id))
        throw error
      }
    }

    AsyncFunction("update") { spec: CooperativeShortcutSpec ->
      val ctx = context()
      val manager = manager() ?: return@AsyncFunction false
      if (!CooperativeShortcutRegistry.isActive(ctx, spec.id)) return@AsyncFunction false
      if (manager.pinnedShortcuts.none { it.id == spec.id && it.isEnabled }) return@AsyncFunction false
      manager.updateShortcuts(listOf(buildShortcut(ctx, spec)))
    }

    AsyncFunction("disable") { ids: List<String>, message: String ->
      val ctx = context()
      val valid = ids.filter(CooperativeShortcutRegistry::isValidId).distinct()
      if (valid.isEmpty()) return@AsyncFunction 0
      // Bookkeeping first: a late approval or crash must not leave it active.
      CooperativeShortcutRegistry.deactivate(ctx, valid)
      val disabledMessage = message.trim().take(120).ifEmpty {
        CooperativeShortcutRegistry.DEFAULT_DISABLED_MESSAGE
      }
      manager()?.disableShortcuts(valid, disabledMessage)
      valid.size
    }

    AsyncFunction("enable") { id: String ->
      val ctx = context()
      require(CooperativeShortcutRegistry.isValidId(id)) { "Invalid shortcut id." }
      val manager = manager() ?: return@AsyncFunction false
      CooperativeShortcutRegistry.activate(ctx, id)
      manager.enableShortcuts(listOf(id))
      true
    }

    AsyncFunction("listPinned") {
      val pinned: List<ShortcutInfo> = manager()?.pinnedShortcuts ?: emptyList()
      // Label and cooperative extras let the app recover a tile after its
      // local storage is lost, and adopt tiles added before extras existed.
      pinned
        .filter { CooperativeShortcutRegistry.isValidId(it.id) }
        .map { info ->
          val item = mutableMapOf<String, Any>("id" to info.id, "enabled" to info.isEnabled)
          info.shortLabel?.toString()?.take(25)?.let { item["label"] = it }
          info.extras?.getString(EXTRA_TENANT_ID)
            ?.takeIf { TENANT_ID_PATTERN.matches(it) }
            ?.let { item["tenantId"] = it }
          info.extras?.getString(EXTRA_MARK)?.take(3)?.let { item["mark"] = it }
          item
        }
    }

    AsyncFunction("consumeObservedPins") {
      CooperativeShortcutRegistry.consumeObserved(context())
    }
  }

  private fun buildShortcut(ctx: Context, spec: CooperativeShortcutSpec): ShortcutInfo {
    require(CooperativeShortcutRegistry.isValidId(spec.id)) { "Invalid shortcut id." }
    val uri = Uri.parse(spec.uri)
    require(
      Regex("^[a-z][a-z0-9+.-]*://cooperative-shortcut/${spec.id}$").matches(spec.uri) &&
        uri.query == null && uri.fragment == null
    ) { "Invalid shortcut destination." }
    val shortLabel = spec.shortLabel.trim().take(25)
    val longLabel = spec.longLabel.trim().take(60).ifEmpty { shortLabel }
    require(shortLabel.isNotEmpty()) { "A shortcut label is required." }
    require(TENANT_ID_PATTERN.matches(spec.tenantId)) { "Invalid cooperative." }
    // Package-explicit VIEW intent: only this installed variant can resolve it.
    val intent = Intent(Intent.ACTION_VIEW, uri).setPackage(ctx.packageName)
    val resolved = ctx.packageManager.resolveActivity(intent, 0)
    require(resolved?.activityInfo?.packageName == ctx.packageName) {
      "This build cannot open cooperative shortcuts."
    }
    return ShortcutInfo.Builder(ctx, spec.id)
      .setShortLabel(shortLabel)
      .setLongLabel(longLabel)
      .setIcon(Icon.createWithAdaptiveBitmap(renderMark(ctx, spec.mark, spec.environment)))
      .setIntent(intent)
      // Not a credential: only names the cooperative the tile opens, so a
      // reinstall or cleared storage can still brand its sign-in.
      .setExtras(
        PersistableBundle().apply {
          putString(EXTRA_TENANT_ID, spec.tenantId)
          putString(EXTRA_MARK, spec.mark.filter { it.isLetterOrDigit() }.take(3))
        }
      )
      .build()
  }

  /** Locally rasterized cooperative mark in the adaptive-icon safe zone. */
  private fun renderMark(ctx: Context, mark: String, environment: String): Bitmap {
    val size = (108 * ctx.resources.displayMetrics.density).toInt().coerceIn(108, 432)
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.parseColor("#087665"))
    val text = mark.filter { it.isLetterOrDigit() }.take(3).uppercase().ifEmpty { "HV" }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      textAlign = Paint.Align.CENTER
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textSize = size * (if (text.length > 2) 0.2f else 0.26f)
    }
    val baseline = size / 2f - (paint.descent() + paint.ascent()) / 2f
    canvas.drawText(text, size / 2f, baseline, paint)
    val badge = when (environment) {
      "preview" -> "#2F6FDB"
      "development" -> "#E0A100"
      else -> null
    }
    if (badge != null) {
      // Recognizable non-production treatment inside the 66dp safe zone.
      val band = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor(badge) }
      canvas.drawRect(size * 0.2f, size * 0.7f, size * 0.8f, size * 0.76f, band)
    }
    return bitmap
  }

  companion object {
    @Volatile private var instance: WeakReference<CooperativeShortcutsModule>? = null

    internal fun notifyPinObserved(id: String) {
      instance?.get()?.sendEvent("onPinObserved", mapOf("id" to id))
    }
  }
}
