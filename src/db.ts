import Dexie, { type EntityTable } from "dexie";
import {
  defaultDailyMissions,
  defaultOnboarding,
  migrateAnySave,
} from "./migrations";
import type {
  CloudSnapshot,
  GameState,
  InventoryItem,
  OnboardingProgress,
  Pet,
  Relationship,
  SaveFile,
  SocialFeedState,
  SyncConflict,
  SyncLock,
  SyncLog,
  SyncQueueItem,
  SyncState,
} from "./types";

export interface Log {
  id?: number;
  at: number;
  type: string;
  message: string;
}
export interface RecordRow {
  id: string;
  value: unknown;
}
export interface Snapshot {
  id?: number;
  at: number;
  data: unknown;
}
const stores = {
  pets: "id,lastUpdatedAt",
  gameState: "id,lastSavedAt",
  inventory: "id,itemId",
  activityLogs: "++id,at,type",
  npcRelationships: "npcId,affection",
  achievements: "id",
  evolutionAlbum: "id",
  settings: "id",
  saveSnapshots: "++id,at",
};
const storesV3 = {
  ...stores,
  syncState: "id,status,dirty",
  syncQueue: "id,updatedAt,revision",
  syncConflicts: "++id,createdAt,status",
  cloudSnapshots: "++id,createdAt,source",
  syncLogs: "++id,createdAt,type",
  dailyMissions: "id",
  socialFeed: "id",
  onboardingProgress: "id",
  syncLocks: "id,expiresAt",
};

type PicoDb = Dexie & {
  pets: EntityTable<Pet, "id">;
  gameState: EntityTable<GameState, "id">;
  inventory: EntityTable<InventoryItem, "id">;
  activityLogs: EntityTable<Log, "id">;
  npcRelationships: EntityTable<Relationship, "npcId">;
  achievements: EntityTable<RecordRow, "id">;
  evolutionAlbum: EntityTable<RecordRow, "id">;
  settings: EntityTable<RecordRow, "id">;
  saveSnapshots: EntityTable<Snapshot, "id">;
  syncState: EntityTable<SyncState, "id">;
  syncQueue: EntityTable<SyncQueueItem, "id">;
  syncConflicts: EntityTable<SyncConflict, "id">;
  cloudSnapshots: EntityTable<CloudSnapshot, "id">;
  syncLogs: EntityTable<SyncLog, "id">;
  dailyMissions: EntityTable<RecordRow, "id">;
  socialFeed: EntityTable<RecordRow, "id">;
  onboardingProgress: EntityTable<RecordRow, "id">;
  syncLocks: EntityTable<SyncLock, "id">;
};
export const db = new Dexie("PicoPalsDB") as PicoDb;
db.version(1).stores(stores);
db.version(2).stores(stores);
db.version(3)
  .stores(storesV3)
  .upgrade(async (tx) => {
    const pet = await tx.table("pets").toCollection().first(),
      game = await tx.table("gameState").get("main");
    if (pet && game) {
      const settingsRows = await tx.table("settings").toArray();
      const legacy = {
        schemaVersion: 2,
        exportedAt: Date.now(),
        pet,
        game,
        inventory: await tx.table("inventory").toArray(),
        relationships: await tx.table("npcRelationships").toArray(),
        album: (await tx.table("evolutionAlbum").toArray()).map(
          (x: { id: string }) => x.id,
        ),
        achievements: (await tx.table("achievements").toArray()).map(
          (x: { id: string }) => x.id,
        ),
        settings: Object.fromEntries(
          settingsRows
            .filter((x: { id: string }) => x.id !== "__saveMeta")
            .map((x: { id: string; value: unknown }) => [x.id, x.value]),
        ),
        ...((settingsRows.find((x: { id: string }) => x.id === "__saveMeta")
          ?.value as object) ?? {}),
      };
      await tx.table("saveSnapshots").add({ at: Date.now(), data: legacy });
    }
    const now = Date.now(),
      deviceId = makeId("device");
    await tx
      .table("syncState")
      .put({
        id: "main",
        deviceId,
        deviceName: defaultDeviceName(),
        cloudSyncEnabled: false,
        localRevision: 0,
        lastSyncedRevision: 0,
        lastKnownCloudRevision: 0,
        dirty: false,
        pendingChanges: 0,
        status: "local-only",
        lastLocalSaveAt: now,
      });
  });

const makeId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
const defaultDeviceName = () => {
  const platform =
    typeof navigator !== "undefined" ? navigator.platform : "Browser";
  return `PicoPals ${platform || "裝置"}`.slice(0, 40);
};
const metaOf = (s: SaveFile) => ({
  schemaVersion: 3,
  albumEntries: s.albumEntries,
  npcProgress: s.npcProgress,
  unlockedDecor: s.unlockedDecor,
  equippedDecor: s.equippedDecor,
  plantState: s.plantState,
  legacyTraits: s.legacyTraits,
  evolutionHistory: s.evolutionHistory,
  itemDefinitionsVersion: s.itemDefinitionsVersion,
  dailyMissions: s.dailyMissions,
  socialFeed: s.socialFeed,
  onboardingProgress: s.onboardingProgress,
  appVersion: s.appVersion,
});

export async function ensureSyncState(): Promise<SyncState> {
  const existing = await db.syncState.get("main");
  if (existing) return existing;
  const state: SyncState = {
    id: "main",
    deviceId: makeId("device"),
    deviceName: defaultDeviceName(),
    cloudSyncEnabled: false,
    localRevision: 0,
    lastSyncedRevision: 0,
    lastKnownCloudRevision: 0,
    dirty: false,
    pendingChanges: 0,
    status: "local-only",
    lastLocalSaveAt: Date.now(),
  };
  await db.syncState.put(state);
  return state;
}
export async function loadSave(): Promise<SaveFile | null> {
  const pet = await db.pets.toCollection().first(),
    game = await db.gameState.get("main");
  if (!pet || !game) return null;
  const inventory = await db.inventory.toArray(),
    relationships = await db.npcRelationships.toArray(),
    album = (await db.evolutionAlbum.toArray()).map((x) => x.id),
    achievements = (await db.achievements.toArray()).map((x) => x.id),
    rows = await db.settings.toArray(),
    settings = Object.fromEntries(
      rows.filter((x) => x.id !== "__saveMeta").map((x) => [x.id, x.value]),
    ),
    meta = rows.find((x) => x.id === "__saveMeta")?.value as
      | Partial<SaveFile>
      | undefined;
  const raw = {
    schemaVersion: meta?.schemaVersion ?? 1,
    exportedAt: Date.now(),
    pet,
    game,
    inventory,
    relationships,
    album,
    achievements,
    settings,
    ...meta,
  };
  const save = migrateAnySave(raw);
  if ((raw as { schemaVersion?: number }).schemaVersion !== 3)
    await persistSave(save, {
      trackChange: false,
      action: "schema-v3-migration",
    });
  return save;
}

export async function persistSave(
  save: SaveFile,
  options: { trackChange?: boolean; action?: string } = {},
) {
  const now = Date.now(),
    track = options.trackChange !== false;
  await db.transaction(
    "rw",
    [
      db.pets,
      db.gameState,
      db.inventory,
      db.npcRelationships,
      db.evolutionAlbum,
      db.achievements,
      db.settings,
      db.dailyMissions,
      db.socialFeed,
      db.onboardingProgress,
      db.syncState,
      db.syncQueue,
    ],
    async () => {
      await db.pets.clear();
      await db.pets.add(save.pet);
      await db.gameState.put({ ...save.game, lastSavedAt: now });
      await db.inventory.clear();
      await db.inventory.bulkPut(save.inventory);
      await db.npcRelationships.clear();
      await db.npcRelationships.bulkPut(save.relationships);
      await db.evolutionAlbum.clear();
      await db.evolutionAlbum.bulkPut(
        save.album.map((id) => ({ id, value: true })),
      );
      await db.achievements.clear();
      await db.achievements.bulkPut(
        save.achievements.map((id) => ({ id, value: true })),
      );
      await db.settings.clear();
      await db.settings.bulkPut([
        ...Object.entries(save.settings).map(([id, value]) => ({ id, value })),
        { id: "__saveMeta", value: metaOf(save) },
      ]);
      await db.dailyMissions.put({ id: "main", value: save.dailyMissions });
      await db.socialFeed.put({ id: "main", value: save.socialFeed });
      await db.onboardingProgress.put({
        id: "main",
        value: save.onboardingProgress,
      });
      if (track) {
        const state = await ensureSyncState(),
          revision = state.localRevision + 1,
          pending = state.pendingChanges + 1;
        await db.syncState.put({
          ...state,
          cloudSyncEnabled: Boolean(save.settings.cloudSyncEnabled),
          localRevision: revision,
          dirty: true,
          pendingChanges: pending,
          lastLocalSaveAt: now,
          status: state.cloudSyncEnabled
            ? typeof navigator !== "undefined" && !navigator.onLine
              ? "offline"
              : "dirty"
            : "local-only",
        });
        await db.syncQueue.put({
          id: "main",
          action: options.action ?? "game-save",
          createdAt: (await db.syncQueue.get("main"))?.createdAt ?? now,
          updatedAt: now,
          revision,
          attempts: 0,
        });
      }
    },
  );
}

export function validateSave(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const x = data as {
    schemaVersion?: number;
    pet?: unknown;
    game?: unknown;
    inventory?: unknown;
    relationships?: unknown;
  };
  return (
    [1, 2, 3].includes(x.schemaVersion ?? 0) &&
    !!x.pet &&
    !!x.game &&
    Array.isArray(x.inventory) &&
    Array.isArray(x.relationships)
  );
}
export async function importSave(data: unknown) {
  if (!validateSave(data)) throw new Error("存檔版本不相容");
  const current = await loadSave();
  if (current) await db.saveSnapshots.add({ at: Date.now(), data: current });
  const next = migrateAnySave(data);
  await persistSave(next, { action: "import" });
  return next;
}
export async function restoreSnapshot() {
  const snap = await db.saveSnapshots.orderBy("at").last();
  if (!snap) throw new Error("沒有可恢復的快照");
  if (!validateSave(snap.data)) throw new Error("快照格式無效");
  const data = migrateAnySave(snap.data);
  await persistSave(data, { action: "restore" });
  return data;
}
export function sanitizeSaveForExport(save: SaveFile): SaveFile {
  const privateKeys = ["uid", "token", "firebase", "auth", "lastError"];
  const settings = Object.fromEntries(
    Object.entries(save.settings).filter(
      ([key]) => !privateKeys.some((x) => key.toLowerCase().includes(x)),
    ),
  );
  return {
    ...save,
    settings: {
      ...settings,
      cloudSyncEnabled: false,
      syncNotifications: Boolean(settings.syncNotifications),
      showConnectionIndicator: Boolean(settings.showConnectionIndicator),
    },
  };
}
export async function createLocalSnapshot(
  save: SaveFile,
  reason: string,
  revision = 0,
) {
  await db.cloudSnapshots.add({
    createdAt: Date.now(),
    source: "local",
    revision,
    saveData: save,
    reason,
  });
  const all = await db.cloudSnapshots.orderBy("createdAt").toArray();
  if (all.length > 10)
    await db.cloudSnapshots.bulkDelete(
      all
        .slice(0, -10)
        .map((x) => x.id!)
        .filter(Boolean),
    );
}
export async function resetDatabase() {
  await db.delete();
  await db.open();
}

export const v3Defaults = {
  dailyMissions: defaultDailyMissions,
  onboarding: defaultOnboarding,
};
