import { npcs } from "./data";
import {
  LIFE_MINUTES,
  STAGE_DURATION_MINUTES,
  hkDate,
  stageToNpc,
} from "./engine";
import type {
  DailyMission,
  GameSettings,
  Pet,
  Relationship,
  SaveFile,
  Stage,
} from "./types";

export type SaveV2 = Omit<
  SaveFile,
  | "schemaVersion"
  | "settings"
  | "dailyMissions"
  | "socialFeed"
  | "onboardingProgress"
  | "appVersion"
> & { schemaVersion: 2; settings: Record<string, unknown> };
type LegacySave = {
  schemaVersion?: number;
  exportedAt?: number;
  pet: Partial<Pet> &
    Pick<Pet, "id" | "stage" | "birthAt" | "lastUpdatedAt" | "speciesId">;
  game: SaveFile["game"];
  inventory?: SaveFile["inventory"];
  relationships?: Relationship[];
  album?: string[];
  achievements?: string[];
  settings?: Record<string, unknown>;
};
const priorMinutes: Record<Stage, number> = {
  egg: 0,
  baby: 1,
  child: 181,
  teen: 901,
  adult: 3061,
};

const missionCatalog: DailyMission[] = [
  {
    id: "healthy-meal",
    kind: "healthy-meal",
    title: "餵一份健康餐",
    target: 1,
    progress: 0,
    completed: false,
  },
  {
    id: "game",
    kind: "game",
    title: "完成一次小遊戲",
    target: 1,
    progress: 0,
    completed: false,
  },
  {
    id: "clean",
    kind: "clean",
    title: "清理一次房間",
    target: 1,
    progress: 0,
    completed: false,
  },
];
export const defaultDailyMissions = (now = Date.now()) => {
  const date = hkDate(now);
  return {
    date,
    missions: missionCatalog.map((x) => ({ ...x })),
    claimed: false,
    streak: 0,
    badges: 0,
    highestSeenDate: date,
  };
};
export const defaultOnboarding = () => ({
  active: true,
  completed: false,
  skipped: false,
  step: 0,
  completedSteps: [],
  rewardClaimed: false,
});

function migrateV1ToV2(input: unknown, now = Date.now()): SaveV2 {
  const old = input as LegacySave;
  if (!old?.pet || !old?.game) throw new Error("存檔內容不完整");
  const p = old.pet,
    stage = p.stage ?? "egg",
    stageStartedAt =
      p.stageStartedAt ?? p.birthAt + priorMinutes[stage] * 60000,
    nextEvolutionAt =
      stage === "adult"
        ? undefined
        : stageStartedAt + STAGE_DURATION_MINUTES[stage] * 60000,
    affection = p.affection ?? 30;
  const pet: Pet = {
    ...p,
    id: p.id,
    stage,
    speciesId: p.speciesId,
    birthAt: p.birthAt,
    lastUpdatedAt: p.lastUpdatedAt,
    stageStartedAt,
    nextEvolutionAt,
    ageMinutes: p.ageMinutes ?? Math.max(0, (now - p.birthAt) / 60000),
    lifeExpectancyMinutes: p.lifeExpectancyMinutes ?? LIFE_MINUTES.base,
    lifeStage: p.lifeStage ?? "young",
    lifetimeCareScore: p.lifetimeCareScore ?? 70,
    name: p.name ?? "波波",
    personality: p.personality ?? "平靜",
    health: p.health ?? 90,
    fullness: p.fullness ?? 75,
    happiness: p.happiness ?? 80,
    cleanliness: p.cleanliness ?? 90,
    energy: p.energy ?? 85,
    affection,
    weight: p.weight ?? 2.5,
    idealWeightMin: p.idealWeightMin ?? 2,
    idealWeightMax: p.idealWeightMax ?? 3,
    poopCount: p.poopCount ?? 0,
    isSick: p.isSick ?? false,
    isSleeping: p.isSleeping ?? false,
    isAlive: p.isAlive ?? true,
    careMistakes: p.careMistakes ?? 0,
    mealsToday: p.mealsToday ?? 0,
    snacksToday: p.snacksToday ?? 0,
    gamesPlayedToday: p.gamesPlayedToday ?? 0,
    giftsReceived: p.giftsReceived ?? 0,
    behaviorTags: p.behaviorTags ?? {
      active: 0,
      sweetTooth: 0,
      healthy: 1,
      clean: 1,
      affectionate: 1,
      calm: 1,
      neglected: 0,
    },
    dailyPetInteraction: p.dailyPetInteraction ?? {
      date: hkDate(now),
      pettingCount: 0,
      feedingAffectionEarned: 0,
      cleaningAffectionEarned: 0,
      gameAffectionEarned: 0,
    },
    affectionHistory: p.affectionHistory ?? [
      { at: now, value: affection, reason: "Schema v2 升級保留" },
    ],
    affectionLastReason: p.affectionLastReason ?? "Schema v2 升級保留",
  };
  const album = old.album ?? [pet.speciesId],
    rels: Relationship[] =
      old.relationships ??
      npcs.map((n) => ({ npcId: n.id, affection: 0, gifts: [] }));
  return {
    schemaVersion: 2,
    exportedAt: now,
    pet,
    game: old.game,
    inventory: old.inventory ?? [],
    relationships: rels.map((r) => ({
      ...r,
      lastTalkDate:
        r.lastTalkDate ?? (r.lastTalkAt ? hkDate(r.lastTalkAt) : undefined),
    })),
    album,
    albumEntries: album.map((id) => ({
      speciesId: id,
      unlockedAt: now,
      raisedCount: 1,
    })),
    achievements: old.achievements ?? [],
    settings: {
      theme: "rose",
      volume: 0.18,
      readable: false,
      highContrast: false,
      ...old.settings,
    },
    npcProgress: Object.fromEntries(
      npcs.map((n) => [
        n.id,
        {
          stage: stageToNpc(stage),
          unlockedLooks: [stageToNpc(stage)],
          coPlayRewardsToday: 0,
        },
      ]),
    ),
    unlockedDecor: [],
    equippedDecor: [],
    plantState: { owned: false, placed: false, growth: 0 },
    legacyTraits: { unlocked: [] },
    evolutionHistory: [],
    itemDefinitionsVersion: 2,
  };
}

export function migrateSaveV2(input: SaveV2, now = Date.now()): SaveFile {
  const settings: GameSettings = {
    ...input.settings,
    cloudSyncEnabled: false,
    syncNotifications: true,
    showConnectionIndicator: true,
  };
  return {
    ...input,
    schemaVersion: 3,
    exportedAt: now,
    settings,
    dailyMissions: defaultDailyMissions(now),
    socialFeed: { date: hkDate(now), posts: [], lastGeneratedAt: 0 },
    onboardingProgress: defaultOnboarding(),
    appVersion: "3.0.0",
  };
}
export function migrateSaveV1(input: unknown, now = Date.now()): SaveFile {
  return migrateSaveV2(migrateV1ToV2(input, now), now);
}
export function migrateAnySave(input: unknown, now = Date.now()): SaveFile {
  if (isSaveV3(input)) return input;
  if (isSaveV2(input)) return migrateSaveV2(input, now);
  return migrateSaveV1(input, now);
}
export function isSaveV2(value: unknown): value is SaveV2 {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { schemaVersion?: number }).schemaVersion === 2,
  );
}
export function isSaveV3(value: unknown): value is SaveFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { schemaVersion?: number }).schemaVersion === 3,
  );
}
