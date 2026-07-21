export type Stage = "egg" | "baby" | "child" | "teen" | "adult";
export type NpcStage = Exclude<Stage, "egg">;
export type LifeStage = "young" | "mature" | "senior";
export type Personality = "活潑" | "溫柔" | "害羞" | "優雅" | "平靜" | "幽默";
export type BehaviorTag =
  | "active"
  | "sweetTooth"
  | "healthy"
  | "clean"
  | "affectionate"
  | "calm"
  | "neglected";
export type LegacyTrait =
  | "active"
  | "healthy"
  | "clean"
  | "affectionate"
  | "calm"
  | "sweet";
export type LegacyCosmetic = "star" | "ribbon" | "halo" | "shell" | "accent";
export interface Tags extends Record<BehaviorTag, number> {}
export interface DailyPetInteraction {
  date: string;
  pettingCount: number;
  feedingAffectionEarned: number;
  cleaningAffectionEarned: number;
  gameAffectionEarned: number;
  lastPettedAt?: number;
}
export interface AffectionPoint {
  at: number;
  value: number;
  reason: string;
}
export interface Pet {
  id: string;
  name: string;
  speciesId: string;
  stage: Stage;
  personality: Personality;
  birthAt: number;
  lastUpdatedAt: number;
  ageMinutes: number;
  stageStartedAt: number;
  nextEvolutionAt?: number;
  lifeExpectancyMinutes: number;
  lifeStage: LifeStage;
  lifetimeCareScore: number;
  health: number;
  fullness: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  affection: number;
  weight: number;
  idealWeightMin: number;
  idealWeightMax: number;
  poopCount: number;
  isSick: boolean;
  sicknessType?: string;
  sickSince?: number;
  isSleeping: boolean;
  sleepStartedAt?: number;
  isAlive: boolean;
  careMistakes: number;
  mealsToday: number;
  snacksToday: number;
  gamesPlayedToday: number;
  giftsReceived: number;
  behaviorTags: Tags;
  dailyPetInteraction: DailyPetInteraction;
  affectionHistory: AffectionPoint[];
  affectionLastReason?: string;
  spouseNpcId?: string;
  marriedAt?: number;
  emergencySince?: number;
  departedAt?: number;
  departureReason?: "natural" | "neglect";
  legacyTrait?: LegacyTrait;
  legacyCosmetic?: LegacyCosmetic;
}
export interface Species {
  id: string;
  name: string;
  en: string;
  stage: Stage;
  color: string;
  accent: string;
  shape: number;
  description: string;
  favoriteFood: string;
  favoriteGift: string;
  personality: Personality;
  weight: [number, number];
  from: string[];
  hint: string;
}
export interface Food {
  id: string;
  name: string;
  kind: "meal" | "snack";
  price: number;
  fullness: number;
  happiness: number;
  weight: number;
  health: number;
  icon: string;
}
export interface Gift {
  id: string;
  name: string;
  price: number;
  rarity: "common" | "uncommon" | "rare" | "special";
  description: string;
  preferredBy: string[];
  affectionValue: number;
  icon: string;
}
export interface NpcLook {
  stage: NpcStage;
  name: string;
  color: string;
  accent: string;
  shape: number;
  feature: string;
  dialogue: string[];
  preference: string;
}
export interface Npc {
  id: string;
  name: string;
  en: string;
  personality: Personality;
  likes: string[];
  dislikes: string[];
  color: string;
  dialogue: string[];
  looks: Record<NpcStage, NpcLook>;
}
export interface NpcProgress {
  stage: NpcStage;
  unlockedLooks: string[];
  coPlayDate?: string;
  coPlayRewardsToday: number;
}
export interface GameState {
  id: "main";
  coins: number;
  lastSavedAt: number;
  highScores: Record<string, number>;
  weightHistory: { at: number; value: number }[];
  generation: number;
  clockAnomalies: number;
  history: Memorial[];
}
export interface Memorial {
  name: string;
  speciesId: string;
  bornAt: number;
  passedAt: number;
  spouseNpcId?: string;
  careGrade: string;
  departureReason?: "natural" | "neglect";
  ageMinutes?: number;
  legacyTrait?: LegacyTrait;
}
export interface Relationship {
  npcId: string;
  affection: number;
  lastTalkAt?: number;
  lastTalkDate?: string;
  gifts: string[];
}
export interface InventoryItem {
  id: string;
  itemId: string;
  quantity: number;
}
export interface EvolutionRecord {
  at: number;
  fromSpeciesId: string;
  toSpeciesId: string;
  fromStage: Stage;
  toStage: Stage;
}
export interface AlbumEntry {
  speciesId: string;
  unlockedAt: number;
  raisedCount: number;
}
export interface PlantState {
  owned: boolean;
  placed: boolean;
  growth: 0 | 1 | 2;
  lastWateredDate?: string;
}
export type ItemCategory =
  | "food"
  | "gift"
  | "medicine"
  | "decor"
  | "social"
  | "proposal";
export interface ItemEffect {
  health?: number;
  energy?: number;
  happiness?: number;
  affection?: number;
}
export interface ShopItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  icon: string;
  description: string;
  consumable: boolean;
  unique: boolean;
  useAt: string;
  effect?: ItemEffect;
}
export interface OfflineSummary {
  minutes: number;
  fullness: number;
  happiness: number;
  cleanliness: number;
  weight: number;
  poops: number;
  clockAnomaly: boolean;
  evolutions: EvolutionRecord[];
  departed: boolean;
}
export type SyncStatus =
  | "local-only"
  | "offline"
  | "idle"
  | "dirty"
  | "syncing"
  | "synced"
  | "conflict"
  | "auth-required"
  | "error";
export interface SyncState {
  id: "main";
  deviceId: string;
  deviceName: string;
  cloudSyncEnabled: boolean;
  currentUserId?: string;
  localRevision: number;
  lastSyncedRevision: number;
  lastKnownCloudRevision: number;
  dirty: boolean;
  pendingChanges: number;
  lastLocalSaveAt?: number;
  lastSyncAttemptAt?: number;
  lastSuccessfulSyncAt?: number;
  status: SyncStatus;
  lastError?: string;
  lastChecksum?: string;
}
export interface SyncQueueItem {
  id: "main";
  action: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  attempts: number;
  nextAttemptAt?: number;
}
export interface SyncConflict {
  id?: number;
  createdAt: number;
  status: "pending" | "resolved" | "kept";
  localRevision: number;
  cloudRevision: number;
  localSave: SaveFile;
  cloudSave: SaveFile;
  resolution?: "local" | "cloud";
  resolvedAt?: number;
}
export interface CloudSnapshot {
  id?: number;
  createdAt: number;
  source: "local" | "cloud";
  revision: number;
  saveData: SaveFile;
  reason: string;
}
export interface SyncLog {
  id?: number;
  type:
    | "upload"
    | "download"
    | "conflict"
    | "restore"
    | "login"
    | "logout"
    | "error";
  deviceId: string;
  revision: number;
  createdAt: number;
  summary: string;
}
export interface SyncLock {
  id: "main";
  ownerTabId: string;
  acquiredAt: number;
  expiresAt: number;
}
export type DailyMissionKind =
  | "healthy-meal"
  | "game"
  | "clean"
  | "talk"
  | "pet"
  | "water"
  | "decor"
  | "gift"
  | "sleep";
export interface DailyMission {
  id: string;
  kind: DailyMissionKind;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
}
export interface DailyMissionState {
  date: string;
  missions: DailyMission[];
  claimed: boolean;
  streak: number;
  lastClaimedDate?: string;
  badges: number;
  highestSeenDate: string;
}
export interface SocialPost {
  id: string;
  npcId: string;
  date: string;
  scene: string;
  mood: string;
  message: string;
  actions: ("reply" | "gift" | "play")[];
  replied: boolean;
  createdAt: number;
}
export interface SocialFeedState {
  date: string;
  posts: SocialPost[];
  lastGeneratedAt: number;
}
export interface OnboardingProgress {
  active: boolean;
  completed: boolean;
  skipped: boolean;
  step: number;
  completedSteps: string[];
  rewardClaimed: boolean;
}
export interface CloudSaveEnvelope {
  ownerUid: string;
  syncSchemaVersion: 1;
  saveSchemaVersion: 3;
  revision: number;
  baseRevision: number;
  deviceId: string;
  deviceName: string;
  clientUpdatedAt: number;
  serverUpdatedAt?: unknown;
  checksum: string;
  saveData: SaveFile;
  lastAction?: string;
  appVersion: string;
}
export interface CloudDevice {
  ownerUid: string;
  deviceId: string;
  deviceName: string;
  firstSeenAt?: unknown;
  lastSeenAt?: unknown;
  appVersion: string;
  platform: string;
  lastSyncedRevision: number;
}
export interface GameSettings extends Record<string, unknown> {
  cloudSyncEnabled: boolean;
  syncNotifications: boolean;
  showConnectionIndicator: boolean;
}
export interface SaveFile {
  schemaVersion: 3;
  exportedAt: number;
  pet: Pet;
  game: GameState;
  inventory: InventoryItem[];
  relationships: Relationship[];
  album: string[];
  albumEntries: AlbumEntry[];
  achievements: string[];
  settings: GameSettings;
  npcProgress: Record<string, NpcProgress>;
  unlockedDecor: string[];
  equippedDecor: string[];
  plantState: PlantState;
  legacyTraits: {
    equipped?: LegacyTrait;
    unlocked: LegacyTrait[];
    cosmetic?: LegacyCosmetic;
  };
  evolutionHistory: EvolutionRecord[];
  itemDefinitionsVersion: number;
  dailyMissions: DailyMissionState;
  socialFeed: SocialFeedState;
  onboardingProgress: OnboardingProgress;
  appVersion: string;
}
