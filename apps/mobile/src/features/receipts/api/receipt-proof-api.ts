import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { getWebUrl } from "@/lib/base-url"
import { mobileRequestHeaders } from "@/lib/mobile-trpc-client"
import { requireOptionalNativeModule } from "expo"
import { fetch } from "expo/fetch"
import { File } from "expo-file-system"
import * as FileSystem from "expo-file-system/legacy"
import type { ImagePickerOptions } from "expo-image-picker"
import * as Sharing from "expo-sharing"
import { Linking } from "react-native"

const maxProofBytes = 10 * 1024 * 1024
const proofPurpose = "payment_receipt_proof"
const receiptUploadPath = /^\/api\/uploads\/[0-9a-f-]{36}$/i

export type ReceiptProofSource = "camera" | "photos" | "pdf"
export type ReceiptProofFile = {
  fileName: string
  contentType: string
  size: number
  uri: string
}

export async function chooseReceiptProof(
  source: ReceiptProofSource
): Promise<ReceiptProofFile | null> {
  let fileInfo: Omit<ReceiptProofFile, "size">
  if (source === "pdf") {
    if (!requireOptionalNativeModule("ExpoDocumentPicker")) {
      throw new Error(
        "PDF attachments require a newer app build. You can paste a proof link."
      )
    }
    const DocumentPicker = await import("expo-document-picker")
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: "application/pdf",
    })
    if (result.canceled) return null
    const asset = result.assets[0]
    fileInfo = {
      uri: asset.uri,
      contentType: "application/pdf",
      fileName: asset.name,
    }
  } else {
    if (!requireOptionalNativeModule("ExponentImagePicker")) {
      throw new Error(
        "Photo attachments require a newer app build. You can paste a proof link."
      )
    }
    const ImagePicker = await import("expo-image-picker")
    const options: ImagePickerOptions = {
      mediaTypes: ["images"],
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      quality: 0.85,
    }
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted)
        throw new Error("Allow camera access in Settings to take a photo.")
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
    if (result.canceled) return null
    const asset = result.assets[0]
    // Use the picker’s output format. Some devices transcode the selected photo.
    const pngExtension = /\.png$/i.test(asset.uri)
    const jpegExtension = /\.jpe?g$/i.test(asset.uri)
    const png =
      pngExtension || (!jpegExtension && asset.mimeType === "image/png")
    const jpeg =
      jpegExtension || (!pngExtension && asset.mimeType === "image/jpeg")
    if (!png && !jpeg) throw new Error("Choose a JPG or PNG photo.")
    fileInfo = {
      uri: asset.uri,
      contentType: png ? "image/png" : "image/jpeg",
      fileName:
        (asset.fileName ?? "receipt").replace(/\.[^.]+$/, "") +
        (png ? ".png" : ".jpg"),
    }
  }
  const file = new File(fileInfo.uri)
  if (!file.size || file.size > maxProofBytes) {
    throw new Error("Choose a nonempty JPG, PNG or PDF up to 10 MB.")
  }
  return {
    ...fileInfo,
    fileName: fileInfo.fileName.slice(-160),
    size: file.size,
  }
}

async function uploadFetch(
  url: string,
  init: Parameters<typeof fetch>[1],
  timeout: number
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function uploadReceiptProof(proof: ReceiptProofFile) {
  if (isMobileDevFixtureSession()) {
    return { fileName: proof.fileName, url: proof.uri }
  }
  const root = `${getWebUrl()}/api/uploads`
  const headers = mobileRequestHeaders()
  async function post(path: string, body: object) {
    const response = await uploadFetch(
      `${root}${path}`,
      {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      20_000
    )
    if (!response.ok) throw new Error("Proof upload could not be authorised.")
    return response.json()
  }
  const request = (await post("/intent", {
    fileName: proof.fileName,
    contentType: proof.contentType,
    size: proof.size,
    purpose: proofPurpose,
  })) as { mode: "local" } | { mode: "private_blob"; intent: string }
  if (request.mode === "local") {
    const task = FileSystem.createUploadTask(root, proof.uri, {
      fieldName: "file",
      headers,
      httpMethod: "POST",
      mimeType: proof.contentType,
      parameters: { fileName: proof.fileName, purpose: proofPurpose },
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    })
    const timer = setTimeout(
      () => void task.cancelAsync().catch(() => undefined),
      60_000
    )
    try {
      const result = await task.uploadAsync()
      if (!result || result.status < 200 || result.status >= 300)
        throw new Error("Proof upload failed.")
      return JSON.parse(result.body) as { fileName: string; url: string }
    } finally {
      clearTimeout(timer)
    }
  }

  const token = (await post("/mobile-token", { intent: request.intent })) as {
    url: string
    headers: Record<string, string>
  }
  // Finalization checks the exact object and is safe even if the PUT's response timed out.
  await uploadFetch(
    token.url,
    {
      method: "PUT",
      credentials: "omit",
      redirect: "error",
      headers: token.headers,
      body: await new File(proof.uri).arrayBuffer(),
    },
    120_000
  ).catch(() => undefined)
  return post("/finalize", { intent: request.intent }) as Promise<{
    fileName: string
    url: string
  }>
}

export async function openReceiptProof(url: string, fileName: string | null) {
  if (!receiptUploadPath.test(url)) {
    if (
      !/^https?:\/\//i.test(url) &&
      !(isMobileDevFixtureSession() && url.startsWith("file:"))
    ) {
      throw new Error("This proof link cannot be opened.")
    }
    if (url.startsWith("file:")) return Sharing.shareAsync(url)
    return Linking.openURL(url)
  }
  if (!(await Sharing.isAvailableAsync()) || !FileSystem.cacheDirectory) {
    throw new Error("This device cannot open the proof.")
  }
  const directory = `${FileSystem.cacheDirectory}receipt-${Date.now()}/`
  const name = (fileName ?? "receipt-proof").replace(/[^a-zA-Z0-9._-]+/g, "-")
  try {
    await FileSystem.makeDirectoryAsync(directory)
    const response = await FileSystem.downloadAsync(
      `${getWebUrl()}${url}`,
      directory + name,
      { headers: mobileRequestHeaders() }
    )
    if (response.status !== 200) throw new Error("Proof is unavailable.")
    await Sharing.shareAsync(response.uri, {
      mimeType:
        response.headers["Content-Type"] ?? response.headers["content-type"],
    })
  } finally {
    await FileSystem.deleteAsync(directory, { idempotent: true }).catch(
      () => undefined
    )
  }
}
