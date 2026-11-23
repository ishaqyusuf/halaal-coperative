package expo.modules.receiptshare

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Process
import android.widget.Toast
import java.util.concurrent.atomic.AtomicBoolean

class ReceiptShareActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val uri = runCatching { receiptUri(intent) }.getOrNull()
    if (uri == null) {
      invalidReceipt()
      finish()
      return
    }
    if (!copying.compareAndSet(false, true)) {
      Toast.makeText(this, "A receipt is already being opened.", Toast.LENGTH_LONG).show()
      finish()
      return
    }

    Thread {
      val saved = try {
        ReceiptShareStore.save(applicationContext, uri)
      } finally {
        copying.set(false)
      }
      runOnUiThread {
        if (saved) {
          packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
            launch.action = ReceiptShareStore.OPEN_ACTION
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(launch)
          }
        } else {
          invalidReceipt()
        }
        finish()
      }
    }.start()
  }

  @Suppress("DEPRECATION")
  private fun receiptUri(intent: Intent): Uri? {
    if (intent.action != Intent.ACTION_SEND ||
      intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION == 0 ||
      (intent.clipData?.itemCount ?: 0) > 1
    ) return null

    val uri = (intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri)
      ?: intent.clipData?.getItemAt(0)?.uri
      ?: return null
    val authority = uri.authority
    val uid = Process.myUid()
    if (uri.scheme != "content" || authority.isNullOrBlank() ||
      checkUriPermission(uri, Process.myPid(), uid, Intent.FLAG_GRANT_READ_URI_PERMISSION) != PackageManager.PERMISSION_GRANTED
    ) return null
    // Never reopen a provider owned by this app on behalf of an outside caller.
    if (packageManager.resolveContentProvider(authority, 0)?.applicationInfo?.uid == uid) return null
    return uri
  }

  private fun invalidReceipt() {
    Toast.makeText(this, "Share one JPG, PNG or PDF up to 10 MB.", Toast.LENGTH_LONG).show()
  }

  private companion object {
    val copying = AtomicBoolean(false)
  }
}
