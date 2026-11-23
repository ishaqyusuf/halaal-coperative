package expo.modules.receiptshare

import android.content.Context
import android.net.Uri
import java.io.DataInputStream
import java.io.File
import java.util.UUID

internal object ReceiptShareStore {
  const val OPEN_ACTION = "expo.modules.receiptshare.OPEN"
  private const val MAX_BYTES = 10 * 1024 * 1024
  private const val LIFETIME_MS = 15 * 60 * 1000L

  fun save(context: Context, uri: Uri): Boolean {
    val directory = directory(context)
    val staging = File(directory, "staging")
    val pending = File(directory, "pending")
    return try {
      context.contentResolver.openInputStream(uri)?.use { input ->
        staging.outputStream().use { output ->
          val chunk = ByteArray(8192)
          var total = 0
          while (true) {
            val read = input.read(chunk)
            if (read < 0) break
            total += read
            if (total > MAX_BYTES) return false
            output.write(chunk, 0, read)
          }
        }
      } ?: return false
      format(staging) != null && synchronized(this) { staging.renameTo(pending) }
    } catch (_: Exception) {
      false
    } finally {
      staging.delete()
    }
  }

  @Synchronized
  fun take(context: Context): Map<String, Any>? {
    val directory = directory(context)
    val now = System.currentTimeMillis()
    directory.listFiles()?.filter { it.name != "staging" && now - it.lastModified() >= LIFETIME_MS }
      ?.forEach { it.delete() }
    val pending = File(directory, "pending")
    if (!pending.isFile) return null
    val (extension, mimeType) = format(pending) ?: run {
      pending.delete()
      return null
    }
    val id = UUID.randomUUID().toString()
    val file = File(directory, "${id}.${extension}")
    if (!pending.renameTo(file)) return null
    return mapOf(
      "id" to id,
      "uri" to Uri.fromFile(file).toString(),
      "fileName" to "Shared receipt.$extension",
      "contentType" to mimeType,
      "size" to file.length(),
      "expiresAt" to file.lastModified() + LIFETIME_MS
    )
  }

  private fun directory(context: Context) = File(context.cacheDir, "receipt-share").apply { mkdirs() }

  private fun format(file: File): Pair<String, String>? {
    if (file.length() !in 1..MAX_BYTES.toLong()) return null
    val header = ByteArray(minOf(8L, file.length()).toInt())
    DataInputStream(file.inputStream()).use { it.readFully(header) }
    return when {
      header.startsWith(0x25, 0x50, 0x44, 0x46, 0x2D) -> "pdf" to "application/pdf"
      header.startsWith(0xFF, 0xD8, 0xFF) -> "jpg" to "image/jpeg"
      header.startsWith(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A) -> "png" to "image/png"
      else -> null
    }
  }

  private fun ByteArray.startsWith(vararg prefix: Int) =
    size >= prefix.size && prefix.indices.all { this[it].toInt() and 0xff == prefix[it] }
}
