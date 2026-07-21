import { advanceSaveTime } from "./engine";
import {
  createLocalSnapshot,
  db,
  ensureSyncState,
  loadSave,
  persistSave,
} from "./db";
import type {
  CloudSaveEnvelope,
  SaveFile,
  SyncConflict,
  SyncLog,
  SyncState,
} from "./types";

export interface CloudBackend {
  readonly userId: string;
  getSave(): Promise<CloudSaveEnvelope | null>;
  createSave(envelope: CloudSaveEnvelope): Promise<CloudSaveEnvelope>;
  compareAndSet(
    expectedRevision: number,
    envelope: CloudSaveEnvelope,
  ): Promise<CloudSaveEnvelope | "conflict">;
  deleteSave(): Promise<void>;
  addSnapshot(envelope: CloudSaveEnvelope, reason: string): Promise<void>;
  addLog(log: SyncLog): Promise<void>;
  touchDevice(state: SyncState): Promise<void>;
}
export type SyncResult = {
  status:
    | "uploaded"
    | "downloaded"
    | "unchanged"
    | "conflict"
    | "skipped"
    | "error";
  message: string;
  save?: SaveFile;
  conflict?: SyncConflict;
};
export interface SyncOptions {
  backend?: CloudBackend | null;
  online?: boolean;
  confirmInitialUpload?: () => Promise<boolean> | boolean;
  lastAction?: string;
  now?: number;
}

const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
    .join(",")}}`;
};
export async function checksumSave(save: SaveFile) {
  const data = new TextEncoder().encode(stable({ ...save, exportedAt: 0 })),
    hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const envelope = (
  save: SaveFile,
  state: SyncState,
  checksum: string,
  revision: number,
  baseRevision: number,
  uid: string,
  now: number,
  lastAction?: string,
): CloudSaveEnvelope => ({
  ownerUid: uid,
  syncSchemaVersion: 1,
  saveSchemaVersion: 3,
  revision,
  baseRevision,
  deviceId: state.deviceId,
  deviceName: state.deviceName,
  clientUpdatedAt: now,
  checksum,
  saveData: { ...save, exportedAt: now },
  lastAction,
  appVersion: "3.0.0",
});

async function setSyncState(patch: Partial<SyncState>) {
  const state = await ensureSyncState(),
    next = { ...state, ...patch, id: "main" as const };
  await db.syncState.put(next);
  return next;
}
async function logLocal(
  state: SyncState,
  type: SyncLog["type"],
  revision: number,
  summary: string,
) {
  await db.syncLogs.add({
    type,
    deviceId: state.deviceId,
    revision,
    createdAt: Date.now(),
    summary,
  });
  const rows = await db.syncLogs.orderBy("createdAt").toArray();
  if (rows.length > 50)
    await db.syncLogs.bulkDelete(
      rows
        .slice(0, -50)
        .map((x) => x.id!)
        .filter(Boolean),
    );
}
export async function synchronizeGameSave(
  options: SyncOptions = {},
): Promise<SyncResult> {
  const now = options.now ?? Date.now(),
    state = await ensureSyncState(),
    backend = options.backend,
    online =
      options.online ??
      (typeof navigator === "undefined" ? true : navigator.onLine);
  if (!state.cloudSyncEnabled)
    return { status: "skipped", message: "雲端同步未開啟。" };
  if (!backend) {
    await setSyncState({
      status: "auth-required",
      lastError: "請先登入雲端帳戶。",
    });
    return { status: "skipped", message: "請先登入雲端帳戶。" };
  }
  if (!online) {
    await setSyncState({ status: "offline", lastError: undefined });
    return { status: "skipped", message: "目前離線，本機存檔仍然安全。" };
  }
  const save = await loadSave();
  if (!save) return { status: "error", message: "找不到本機存檔。" };
  const advanced = advanceSaveTime(save, now).save;
  await persistSave(advanced, {
    trackChange: false,
    action: "sync-checkpoint",
  });
  await createLocalSnapshot(advanced, "同步前快照", state.localRevision);
  await setSyncState({
    status: "syncing",
    lastSyncAttemptAt: now,
    currentUserId: backend.userId,
  });
  try {
    const localChecksum = await checksumSave(advanced),
      cloud = await backend.getSave();
    if (!cloud) {
      const allow = await (options.confirmInitialUpload?.() ?? false);
      if (!allow) {
        await setSyncState({ status: "dirty" });
        return { status: "skipped", message: "等待玩家確認首次上傳。" };
      }
      const created = await backend.createSave(
        envelope(
          advanced,
          state,
          localChecksum,
          1,
          0,
          backend.userId,
          now,
          options.lastAction,
        ),
      );
      await backend.addSnapshot(created, "first-upload");
      await finishSync(
        state,
        created.revision,
        localChecksum,
        backend,
        "首次上傳本機存檔",
      );
      return {
        status: "uploaded",
        message: "本機存檔已安全上傳。",
        save: advanced,
      };
    }
    if (
      cloud.saveSchemaVersion !== 3 ||
      cloud.syncSchemaVersion !== 1 ||
      cloud.ownerUid !== backend.userId
    )
      throw new Error("雲端存檔格式或擁有者無效。");
    const cloudChecksum = await checksumSave(cloud.saveData);
    if (cloudChecksum !== cloud.checksum)
      throw new Error("雲端存檔校驗失敗，沒有覆蓋本機資料。");
    if (localChecksum === cloud.checksum) {
      await finishSync(
        state,
        cloud.revision,
        localChecksum,
        backend,
        "存檔內容相同",
      );
      return {
        status: "unchanged",
        message: "本機與雲端已一致。",
        save: advanced,
      };
    }
    const localDirty =
        state.dirty || state.localRevision > state.lastSyncedRevision,
      cloudChanged =
        cloud.revision > state.lastKnownCloudRevision &&
        cloud.revision !== state.lastSyncedRevision;
    if (!localDirty && cloud.revision > state.lastSyncedRevision) {
      await createLocalSnapshot(advanced, "下載雲端前", state.localRevision);
      const downloaded = advanceSaveTime(cloud.saveData, now).save;
      await persistSave(downloaded, {
        trackChange: false,
        action: "cloud-download",
      });
      await finishSync(
        state,
        cloud.revision,
        cloud.checksum,
        backend,
        "下載較新的雲端存檔",
      );
      broadcast({ type: "download", revision: cloud.revision });
      return {
        status: "downloaded",
        message: "已下載較新的雲端存檔。",
        save: downloaded,
      };
    }
    if (
      localDirty &&
      !cloudChanged &&
      state.lastSyncedRevision === cloud.revision
    ) {
      const next = envelope(
          advanced,
          state,
          localChecksum,
          cloud.revision + 1,
          cloud.revision,
          backend.userId,
          now,
          options.lastAction,
        ),
        saved = await backend.compareAndSet(cloud.revision, next);
      if (saved === "conflict")
        return createConflict(
          state,
          advanced,
          await backend.getSave(),
          backend,
        );
      await finishSync(
        state,
        saved.revision,
        localChecksum,
        backend,
        "上傳本機變更",
      );
      broadcast({ type: "synced", revision: saved.revision });
      return {
        status: "uploaded",
        message: "待同步變更已上傳。",
        save: advanced,
      };
    }
    return createConflict(state, advanced, cloud, backend);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知同步錯誤";
    await setSyncState({ status: "error", lastError: message });
    await logLocal(state, "error", state.localRevision, message);
    return {
      status: "error",
      message: `雲端暫時未能同步，本機存檔仍然安全。${message}`,
    };
  }
}
async function finishSync(
  state: SyncState,
  revision: number,
  checksum: string,
  backend: CloudBackend,
  summary: string,
) {
  await db.transaction("rw", [db.syncState, db.syncQueue], async () => {
    await db.syncState.put({
      ...state,
      currentUserId: backend.userId,
      lastSyncedRevision: revision,
      lastKnownCloudRevision: revision,
      dirty: false,
      pendingChanges: 0,
      lastSuccessfulSyncAt: Date.now(),
      status: "synced",
      lastError: undefined,
      lastChecksum: checksum,
    });
    await db.syncQueue.clear();
  });
  await backend.touchDevice({ ...state, lastSyncedRevision: revision });
  await logLocal(
    state,
    summary.includes("下載") ? "download" : "upload",
    revision,
    summary,
  );
  await backend.addLog({
    type: summary.includes("下載") ? "download" : "upload",
    deviceId: state.deviceId,
    revision,
    createdAt: Date.now(),
    summary,
  });
}
async function createConflict(
  state: SyncState,
  local: SaveFile,
  cloud: CloudSaveEnvelope | null,
  backend: CloudBackend,
): Promise<SyncResult> {
  if (!cloud) throw new Error("建立衝突時找不到雲端版本。");
  const conflict: SyncConflict = {
    createdAt: Date.now(),
    status: "pending",
    localRevision: state.localRevision,
    cloudRevision: cloud.revision,
    localSave: local,
    cloudSave: cloud.saveData,
  };
  const id = await db.syncConflicts.add(conflict);
  await db.syncState.update("main", {
    status: "conflict",
    lastKnownCloudRevision: cloud.revision,
  });
  await backend.addSnapshot(cloud, "conflict");
  await logLocal(
    state,
    "conflict",
    cloud.revision,
    "兩個裝置同時修改，等待玩家選擇",
  );
  return {
    status: "conflict",
    message: "發現兩個不同的萌寵存檔。",
    conflict: { ...conflict, id },
  };
}

export async function resolveConflict(
  id: number,
  choice: "local" | "cloud" | "keep",
  backend?: CloudBackend | null,
) {
  const conflict = await db.syncConflicts.get(id),
    state = await ensureSyncState();
  if (!conflict) throw new Error("找不到衝突記錄。");
  if (choice === "keep") {
    await db.syncConflicts.update(id, { status: "kept" });
    await db.syncState.update("main", { status: "conflict" });
    return conflict.localSave;
  }
  if (!backend) throw new Error("請先重新登入再處理覆蓋操作。");
  await createLocalSnapshot(
    conflict.localSave,
    `衝突處理：使用${choice === "local" ? "本機" : "雲端"}版本`,
    conflict.localRevision,
  );
  const cloud = await backend.getSave();
  if (cloud) await backend.addSnapshot(cloud, "before-conflict-resolution");
  const selected = choice === "local" ? conflict.localSave : conflict.cloudSave;
  if (choice === "local") {
    if (!cloud)
      await backend.createSave(
        envelope(
          selected,
          state,
          await checksumSave(selected),
          1,
          0,
          backend.userId,
          Date.now(),
          "resolve-local",
        ),
      );
    else {
      const saved = await backend.compareAndSet(
        cloud.revision,
        envelope(
          selected,
          state,
          await checksumSave(selected),
          cloud.revision + 1,
          cloud.revision,
          backend.userId,
          Date.now(),
          "resolve-local",
        ),
      );
      if (saved === "conflict")
        throw new Error("雲端再次變更，請重新檢查衝突。");
    }
  }
  await persistSave(selected, {
    trackChange: false,
    action: "resolve-conflict",
  });
  await db.syncConflicts.update(id, {
    status: "resolved",
    resolution: choice,
    resolvedAt: Date.now(),
  });
  const latest = await backend.getSave(),
    sum = await checksumSave(selected);
  await finishSync(
    state,
    latest?.revision ?? conflict.cloudRevision,
    sum,
    backend,
    choice === "local" ? "使用本機版本解決衝突" : "下載雲端版本解決衝突",
  );
  return selected;
}

const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("picopals-sync")
    : null;
export const broadcast = (message: unknown) => channel?.postMessage(message);
export const subscribeSync = (listener: (message: unknown) => void) => {
  if (!channel) return () => undefined;
  const receive = (event: MessageEvent) => listener(event.data);
  channel.addEventListener("message", receive);
  return () => channel.removeEventListener("message", receive);
};
export async function acquireSyncLock(ownerTabId: string, now = Date.now()) {
  return db.transaction("rw", db.syncLocks, async () => {
    const lock = await db.syncLocks.get("main");
    if (lock && lock.expiresAt > now && lock.ownerTabId !== ownerTabId)
      return false;
    await db.syncLocks.put({
      id: "main",
      ownerTabId,
      acquiredAt: now,
      expiresAt: now + 30000,
    });
    return true;
  });
}
export async function releaseSyncLock(ownerTabId: string) {
  const lock = await db.syncLocks.get("main");
  if (lock?.ownerTabId === ownerTabId) await db.syncLocks.delete("main");
}
export const retryDelay = (attempt: number) =>
  [5000, 15000, 30000, 60000, 300000][Math.min(4, Math.max(0, attempt))]!;
export class SyncScheduler {
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  constructor(private run: () => Promise<SyncResult>) {}
  schedule(delay = 5000) {
    clearTimeout(this.timer);
    this.attempts = 0;
    this.timer = setTimeout(() => void this.execute(), delay);
  }
  private async execute() {
    const result = await this.run();
    if (result.status === "error" && this.attempts < 5) {
      const delay = retryDelay(this.attempts++);
      this.timer = setTimeout(() => void this.execute(), delay);
    } else if (result.status !== "error") {
      this.attempts = 0;
    }
  }
  cancel() {
    clearTimeout(this.timer);
  }
}
