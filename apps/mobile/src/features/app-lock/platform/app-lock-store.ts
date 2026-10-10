import { createAppLockStore } from "@/features/app-lock/model/app-lock-store-core"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"

export const appLockStore = createAppLockStore({
  digest: (value) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  markerStore: {
    deleteItem: (key) => AsyncStorage.removeItem(key),
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
  },
  now: Date.now,
  randomBytes: (count) => Crypto.getRandomBytesAsync(count),
  secureStore: {
    deleteItem: (key) => SecureStore.deleteItemAsync(key),
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  },
})
