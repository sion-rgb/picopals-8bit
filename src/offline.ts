export interface OfflineCapability {
  online: boolean;
  serviceWorker: boolean;
  cached: boolean;
  indexedDb: boolean;
  persistent: boolean;
  cacheVersion: string;
}
export async function inspectOffline(): Promise<OfflineCapability> {
  const serviceWorker =
      "serviceWorker" in navigator &&
      Boolean(
        await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL),
      ),
    keys = "caches" in window ? await caches.keys() : [],
    indexedDb = await new Promise<boolean>((resolve) => {
      if (!window.indexedDB) return resolve(false);
      const req = indexedDB.open("PicoPalsOfflineProbe");
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase("PicoPalsOfflineProbe");
        resolve(true);
      };
      req.onerror = () => resolve(false);
    }),
    persistent = (await navigator.storage?.persisted?.()) ?? false;
  return {
    online: navigator.onLine,
    serviceWorker,
    cached: keys.some((x) => x.startsWith("picopals-")),
    indexedDb,
    persistent,
    cacheVersion: keys.find((x) => x.startsWith("picopals-")) ?? "尚未快取",
  };
}
export async function downloadOfflineAssets() {
  if (!("serviceWorker" in navigator))
    throw new Error("此瀏覽器不支援 Service Worker。");
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "CACHE_OFFLINE" });
  await fetch(`${import.meta.env.BASE_URL}index.html`, { cache: "reload" });
  return inspectOffline();
}
export async function updateOfflineAssets() {
  const reg = await navigator.serviceWorker.getRegistration(
    import.meta.env.BASE_URL,
  );
  await reg?.update();
  return downloadOfflineAssets();
}
export async function clearOfflineCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith("picopals-"))
      .map((key) => caches.delete(key)),
  );
  return inspectOffline();
}
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
