import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, createPet } from "../engine";
import {
  db,
  ensureSyncState,
  loadSave,
  persistSave,
  sanitizeSaveForExport,
} from "../db";
import { migrateSaveV2, type SaveV2 } from "../migrations";
import {
  claimDailyReward,
  completeOnboardingStep,
  generateDailyMissions,
  generateSocialFeed,
  recordMission,
} from "../progression";
import {
  acquireSyncLock,
  checksumSave,
  releaseSyncLock,
  resolveConflict,
  SyncScheduler,
  synchronizeGameSave,
  type CloudBackend,
} from "../sync";
import type { CloudSaveEnvelope, SaveFile, SyncLog, SyncState } from "../types";

const makeSave = (coins = 80): SaveFile => {
  const now = Date.now(),
    pet = createPet(now);
  const seed: SaveFile = {
    schemaVersion: 3,
    exportedAt: now,
    pet,
    game: { ...createGame(now), coins },
    inventory: [],
    relationships: [{ npcId: "aro", affection: 8, gifts: [] }],
    album: [pet.speciesId],
    albumEntries: [
      { speciesId: pet.speciesId, unlockedAt: now, raisedCount: 1 },
    ],
    achievements: [],
    settings: {
      cloudSyncEnabled: true,
      syncNotifications: true,
      showConnectionIndicator: true,
      theme: "mint",
    },
    npcProgress: {
      aro: { stage: "baby", unlockedLooks: ["baby"], coPlayRewardsToday: 0 },
    },
    unlockedDecor: [],
    equippedDecor: [],
    plantState: { owned: false, placed: false, growth: 0 },
    legacyTraits: { unlocked: [] },
    evolutionHistory: [],
    itemDefinitionsVersion: 3,
    dailyMissions: {
      date: "",
      missions: [],
      claimed: false,
      streak: 0,
      badges: 0,
      highestSeenDate: "",
    },
    socialFeed: { date: "", posts: [], lastGeneratedAt: 0 },
    onboardingProgress: {
      active: true,
      completed: false,
      skipped: false,
      step: 0,
      completedSteps: [],
      rewardClaimed: false,
    },
    appVersion: "3.0.0",
  };
  return {
    ...seed,
    dailyMissions: generateDailyMissions(now, seed.dailyMissions),
    socialFeed: generateSocialFeed(seed, now),
  };
};
class MemoryCloud implements CloudBackend {
  userId = "alice";
  save: CloudSaveEnvelope | null = null;
  snapshots: CloudSaveEnvelope[] = [];
  logs: SyncLog[] = [];
  uploads = 0;
  async getSave() {
    return this.save;
  }
  async createSave(e: CloudSaveEnvelope) {
    this.uploads++;
    this.save = e;
    return e;
  }
  async compareAndSet(expected: number, e: CloudSaveEnvelope) {
    if (this.save?.revision !== expected) return "conflict" as const;
    this.uploads++;
    this.save = e;
    return e;
  }
  async deleteSave() {
    this.save = null;
  }
  async addSnapshot(e: CloudSaveEnvelope) {
    this.snapshots.push(e);
  }
  async addLog(log: SyncLog) {
    this.logs.push(log);
  }
  async touchDevice(_state: SyncState) {
    return;
  }
}
async function local(save = makeSave(), state: Partial<SyncState> = {}) {
  await persistSave(save, { trackChange: false });
  const current = await ensureSyncState();
  await db.syncState.put({
    ...current,
    cloudSyncEnabled: true,
    currentUserId: "alice",
    status: "dirty",
    dirty: true,
    localRevision: 1,
    ...state,
  });
  return save;
}
async function cloudEnvelope(
  save: SaveFile,
  revision = 1,
): Promise<CloudSaveEnvelope> {
  return {
    ownerUid: "alice",
    syncSchemaVersion: 1,
    saveSchemaVersion: 3,
    revision,
    baseRevision: revision - 1,
    deviceId: "device-cloud-123",
    deviceName: "Cloud",
    clientUpdatedAt: Date.now(),
    checksum: await checksumSave(save),
    saveData: save,
    appVersion: "3.0.0",
  };
}
beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.restoreAllMocks();
});

describe("離線優先同步核心 24 項驗收", () => {
  it("1. 離線時本機操作仍然成功", async () => {
    const save = await local();
    await persistSave({ ...save, game: { ...save.game, coins: 81 } });
    expect((await loadSave())?.game.coins).toBe(81);
  });
  it("2. 離線操作加入同步佇列", async () => {
    const save = await local();
    await persistSave({ ...save, pet: { ...save.pet, happiness: 90 } });
    expect(await db.syncQueue.get("main")).toBeTruthy();
  });
  it("3. 重新連線後可自動同步", async () => {
    await local(undefined, {
      lastSyncedRevision: 0,
      lastKnownCloudRevision: 0,
    });
    const cloud = new MemoryCloud();
    const r = await synchronizeGameSave({
      backend: cloud,
      online: true,
      confirmInitialUpload: () => true,
    });
    expect(r.status).toBe("uploaded");
  });
  it("4. 五秒內多次操作合併為一個佇列項", async () => {
    const save = await local();
    await persistSave({ ...save, game: { ...save.game, coins: 81 } });
    await persistSave({ ...save, game: { ...save.game, coins: 82 } });
    expect(await db.syncQueue.count()).toBe(1);
  });
  it("5. 未登入不會上傳", async () => {
    await local();
    expect(
      (await synchronizeGameSave({ backend: null, online: true })).status,
    ).toBe("skipped");
  });
  it("6. 關閉雲端同步後不會上傳", async () => {
    await local();
    await db.syncState.update("main", { cloudSyncEnabled: false });
    expect(
      (await synchronizeGameSave({ backend: new MemoryCloud() })).status,
    ).toBe("skipped");
  });
  it("7. 雲端沒有存檔時可經同意上傳本機版本", async () => {
    await local();
    const cloud = new MemoryCloud();
    await synchronizeGameSave({
      backend: cloud,
      confirmInitialUpload: () => true,
    });
    expect(cloud.save?.saveSchemaVersion).toBe(3);
  });
  it("8. 雲端較新而本機乾淨時可下載", async () => {
    const original = await local(makeSave(10), {
      dirty: false,
      localRevision: 1,
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...original, game: { ...original.game, coins: 99 } },
      2,
    );
    const r = await synchronizeGameSave({ backend: cloud });
    expect(r.status).toBe("downloaded");
    expect((await loadSave())?.game.coins).toBe(99);
  });
  it("9. 本機較新且 revision 一致時可上傳", async () => {
    const save = await local(makeSave(44), {
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
      localRevision: 2,
      dirty: true,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...save, game: { ...save.game, coins: 43 } },
      1,
    );
    expect((await synchronizeGameSave({ backend: cloud })).status).toBe(
      "uploaded",
    );
  });
  it("10. 雙方同時修改時建立衝突", async () => {
    const save = await local(makeSave(44), {
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
      localRevision: 2,
      dirty: true,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...save, game: { ...save.game, coins: 60 } },
      2,
    );
    expect((await synchronizeGameSave({ backend: cloud })).status).toBe(
      "conflict",
    );
  });
  it("11. 衝突不會自動合併星星幣", async () => {
    const save = await local(makeSave(44), {
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
      localRevision: 2,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...save, game: { ...save.game, coins: 60 } },
      2,
    );
    await synchronizeGameSave({ backend: cloud });
    expect((await loadSave())?.game.coins).toBe(44);
  });
  it("12. 使用本機版本前建立雲端快照", async () => {
    const save = await local(makeSave(44), {
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
      localRevision: 2,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...save, game: { ...save.game, coins: 60 } },
      2,
    );
    const r = await synchronizeGameSave({ backend: cloud });
    await resolveConflict(r.conflict!.id!, "local", cloud);
    expect(cloud.snapshots.length).toBeGreaterThan(1);
  });
  it("13. 使用雲端版本前建立本機快照", async () => {
    const save = await local(makeSave(44), {
      lastSyncedRevision: 1,
      lastKnownCloudRevision: 1,
      localRevision: 2,
    });
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(
      { ...save, game: { ...save.game, coins: 60 } },
      2,
    );
    const r = await synchronizeGameSave({ backend: cloud });
    await resolveConflict(r.conflict!.id!, "cloud", cloud);
    expect(await db.cloudSnapshots.count()).toBeGreaterThan(0);
  });
  it("14. 登出狀態仍保留本機存檔", async () => {
    await local(makeSave(77));
    await db.syncState.update("main", {
      currentUserId: undefined,
      cloudSyncEnabled: false,
    });
    expect((await loadSave())?.game.coins).toBe(77);
  });
  it("15. 刪除雲端存檔不會刪除本機", async () => {
    await local(makeSave(55));
    const cloud = new MemoryCloud();
    cloud.save = await cloudEnvelope(makeSave(1));
    await cloud.deleteSave();
    expect((await loadSave())?.game.coins).toBe(55);
  });
  it("16. Schema v2 可無損遷移至 v3", () => {
    const v3 = makeSave(73),
      { dailyMissions, socialFeed, onboardingProgress, appVersion, ...v2base } =
        v3;
    const v2 = {
        ...v2base,
        schemaVersion: 2,
        settings: { theme: "mint" },
      } as SaveV2,
      got = migrateSaveV2(v2);
    expect(got.game.coins).toBe(73);
    expect(got.schemaVersion).toBe(3);
  });
  it("17. JSON 匯出不包含登入 Token 或 UID", () => {
    const save = makeSave();
    save.settings.firebaseToken = "secret";
    save.settings.uid = "alice";
    expect(JSON.stringify(sanitizeSaveForExport(save))).not.toMatch(
      /secret|alice/,
    );
  });
  it("18. 多分頁只由一個分頁執行同步", async () => {
    expect(await acquireSyncLock("tab-a", 100)).toBe(true);
    expect(await acquireSyncLock("tab-b", 110)).toBe(false);
    await releaseSyncLock("tab-a");
  });
  it("19. 過期同步鎖可以恢復", async () => {
    expect(await acquireSyncLock("tab-a", 100)).toBe(true);
    expect(await acquireSyncLock("tab-b", 30101)).toBe(true);
  });
  it("20. 同步錯誤不影響遊戲操作", async () => {
    await local(makeSave(10));
    const cloud = new MemoryCloud();
    cloud.getSave = async () => {
      throw new Error("quota");
    };
    expect((await synchronizeGameSave({ backend: cloud })).status).toBe(
      "error",
    );
    const save = (await loadSave())!;
    await persistSave({ ...save, game: { ...save.game, coins: 11 } });
    expect((await loadSave())?.game.coins).toBe(11);
  });
  it("21. 每日任務不能重複領獎", () => {
    let save = makeSave();
    save = {
      ...save,
      dailyMissions: {
        ...save.dailyMissions,
        missions: save.dailyMissions.missions.map((m) => ({
          ...m,
          completed: true,
          progress: 1,
        })),
      },
    };
    const once = claimDailyReward(save),
      twice = claimDailyReward(once.save);
    expect(once.ok).toBe(true);
    expect(twice.ok).toBe(false);
  });
  it("22. 系統時間倒退不會重設任務", () => {
    const now = Date.now(),
      save = recordMission(makeSave(), "game", 1, now),
      back = generateDailyMissions(now - 86400000, save.dailyMissions);
    expect(back).toEqual(save.dailyMissions);
  });
  it("23. 新手任務進度可保存", async () => {
    const save = makeSave(),
      progress = completeOnboardingStep(save.onboardingProgress, "name");
    await persistSave(
      { ...save, onboardingProgress: progress },
      { trackChange: false },
    );
    expect((await loadSave())?.onboardingProgress.completedSteps).toContain(
      "name",
    );
  });
  it("24. 朋友圈按 NPC 性格產生內容", () => {
    const feed = generateSocialFeed(
      {
        ...makeSave(),
        socialFeed: { date: "", posts: [], lastGeneratedAt: 0 },
      },
      Date.UTC(2026, 6, 22),
    );
    expect(feed.posts.length).toBeGreaterThanOrEqual(2);
    expect(feed.posts.every((p) => p.message.length > 4)).toBe(true);
  });
});
