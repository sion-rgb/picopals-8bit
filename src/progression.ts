import { npcs } from "./data";
import { hkDate } from "./engine";
import type {
  BehaviorTag,
  DailyMission,
  DailyMissionKind,
  DailyMissionState,
  OnboardingProgress,
  SaveFile,
  SocialFeedState,
  SocialPost,
} from "./types";

const missionPool: { kind: DailyMissionKind; title: string }[] = [
  { kind: "healthy-meal", title: "餵一份健康餐" },
  { kind: "game", title: "完成一次小遊戲" },
  { kind: "clean", title: "清理穢物或打掃" },
  { kind: "talk", title: "與朋友對話" },
  { kind: "pet", title: "撫摸萌寵" },
  { kind: "water", title: "為盆栽澆水" },
  { kind: "decor", title: "使用一件房間裝飾" },
  { kind: "gift", title: "送朋友一份禮物" },
  { kind: "sleep", title: "完成一次睡眠" },
];
const hash = (text: string) =>
  [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
const priorDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number),
    at = Date.UTC(y!, m! - 1, d! - 1);
  return new Date(at).toISOString().slice(0, 10);
};

export function generateDailyMissions(
  now = Date.now(),
  previous?: DailyMissionState,
): DailyMissionState {
  const date = hkDate(now),
    highest = previous?.highestSeenDate ?? date;
  if (previous && date <= highest) return previous;
  const offset = hash(date) % missionPool.length,
    missions: DailyMission[] = Array.from({ length: 3 }, (_, i) => {
      const item = missionPool[(offset + i * 2) % missionPool.length]!;
      return {
        id: `${date}:${item.kind}`,
        kind: item.kind,
        title: item.title,
        target: 1,
        progress: 0,
        completed: false,
      };
    });
  return {
    date,
    missions,
    claimed: false,
    streak: previous?.streak ?? 0,
    lastClaimedDate: previous?.lastClaimedDate,
    badges: previous?.badges ?? 0,
    highestSeenDate: date,
  };
}
export function recordMission(
  save: SaveFile,
  kind: DailyMissionKind,
  amount = 1,
  now = Date.now(),
): SaveFile {
  const daily = generateDailyMissions(now, save.dailyMissions),
    missions = daily.missions.map((m) =>
      m.kind === kind && !m.completed
        ? {
            ...m,
            progress: Math.min(m.target, m.progress + amount),
            completed: m.progress + amount >= m.target,
          }
        : m,
    );
  return { ...save, dailyMissions: { ...daily, missions } };
}
export function claimDailyReward(save: SaveFile, now = Date.now()) {
  const state = generateDailyMissions(now, save.dailyMissions);
  if (state.claimed) return { ok: false, save, reason: "今日獎勵已領取。" };
  if (!state.missions.every((m) => m.completed))
    return { ok: false, save, reason: "完成三項任務後即可領獎。" };
  const streak =
      state.lastClaimedDate === priorDate(state.date) ? state.streak + 1 : 1,
    unlock = streak === 7 ? "streak-wallpaper" : undefined;
  const next: SaveFile = {
    ...save,
    game: { ...save.game, coins: save.game.coins + 20 },
    pet: { ...save.pet, affection: Math.min(100, save.pet.affection + 2) },
    dailyMissions: {
      ...state,
      claimed: true,
      streak,
      lastClaimedDate: state.date,
      badges: state.badges + 1,
    },
    unlockedDecor: unlock
      ? [...new Set([...save.unlockedDecor, unlock])]
      : save.unlockedDecor,
    achievements: [
      ...new Set([
        ...save.achievements,
        "每日星章",
        ...(streak === 3 ? ["三日星光禮物"] : []),
        ...(streak === 14 ? ["限定蛋殼花紋"] : []),
        ...(streak === 30 ? ["限定機身主題"] : []),
      ]),
    ],
  };
  return {
    ok: true,
    save: next,
    reason: "獲得 20 星星幣、親密度 +2 與每日星章！",
  };
}

const scenes: Record<string, string[]> = {
  aro: ["流星山丘", "星軌跑道"],
  milo: ["星花溫室", "晨露草原"],
  roshi: ["月光書房", "安靜樹屋"],
  noah: ["銀河鏡廳", "雲端茶座"],
  sensen: ["古木森林", "苔蘚小徑"],
  pico: ["彈跳廣場", "彩虹滑梯"],
};
const messages: Record<string, string[]> = {
  aro: ["今天差一點就追上最快的星星！", "下一段冒險要一起嗎？"],
  milo: ["新長出的葉子像一顆小星。", "慢慢走也能看到好風景。"],
  roshi: ["這一頁有一朵很像你的星花。", "我把喜歡的段落留給你了。"],
  noah: ["今天的星光很適合拍合照。", "自信也是一種溫柔。"],
  sensen: ["風吹過時，森林說了晚安。", "一起安靜坐一會也很好。"],
  pico: ["我沒有跌倒，只是在和地板打招呼！", "今天的笑話跑得比我還快。"],
};
export function generateSocialFeed(
  save: SaveFile,
  now = Date.now(),
): SocialFeedState {
  const date = hkDate(now);
  if (save.socialFeed.date === date && save.socialFeed.posts.length)
    return save.socialFeed;
  const count = 2 + (hash(date + save.pet.id) % 3),
    available = [...npcs].sort((a, b) => hash(date + a.id) - hash(date + b.id));
  const posts: SocialPost[] = available.slice(0, count).map((npc, i) => {
    const married = save.pet.spouseNpcId === npc.id,
      rel = save.relationships.find((r) => r.npcId === npc.id);
    const base = messages[npc.id] ?? ["今天也看到很亮的星星。"],
      message =
        married &&
        new Date(save.pet.marriedAt ?? 0).getMonth() ===
          new Date(now).getMonth()
          ? "我們的星光紀念日，想再拍一張合照。"
          : base[hash(date + npc.id) % base.length]!;
    return {
      id: `${date}:${npc.id}:${i}`,
      npcId: npc.id,
      date,
      scene: (scenes[npc.id] ?? ["星光廣場"])[i % 2]!,
      mood: rel && rel.affection >= 60 ? "想念" : "愉快",
      message,
      actions: [
        "reply",
        "gift",
        ...(npc.id === "aro" || npc.id === "pico" ? ["play" as const] : []),
      ],
      replied: false,
      createdAt: now + i,
    };
  });
  return { date, posts, lastGeneratedAt: now };
}
export function replyToPost(save: SaveFile, postId: string): SaveFile {
  return {
    ...save,
    socialFeed: {
      ...save.socialFeed,
      posts: save.socialFeed.posts.map((p) =>
        p.id === postId ? { ...p, replied: true } : p,
      ),
    },
    relationships: save.relationships.map((r) => {
      const post = save.socialFeed.posts.find((p) => p.id === postId);
      return post?.npcId === r.npcId
        ? { ...r, affection: Math.min(100, r.affection + 1) }
        : r;
    }),
  };
}

export const onboardingSteps = [
  "name",
  "hatch",
  "status",
  "feed",
  "clean",
  "game",
  "pet",
  "friend",
  "growth",
  "offline",
] as const;
export function completeOnboardingStep(
  progress: OnboardingProgress,
  step: string,
) {
  if (progress.completed || progress.skipped) return progress;
  const completedSteps = [...new Set([...progress.completedSteps, step])],
    index = Math.max(
      progress.step,
      onboardingSteps.indexOf(step as (typeof onboardingSteps)[number]) + 1,
    ),
    completed = completedSteps.length >= onboardingSteps.length;
  return {
    ...progress,
    completedSteps,
    step: index,
    completed,
    active: !completed,
  };
}
export function rewardOnboarding(save: SaveFile): SaveFile {
  if (
    !save.onboardingProgress.completed ||
    save.onboardingProgress.rewardClaimed
  )
    return save;
  return {
    ...save,
    game: { ...save.game, coins: save.game.coins + 10 },
    achievements: [...new Set([...save.achievements, "新手星光緞帶"])],
    onboardingProgress: { ...save.onboardingProgress, rewardClaimed: true },
  };
}
export function growthTendencies(
  save: SaveFile,
): { tag: BehaviorTag; label: string; stars: number }[] {
  const map: { tag: BehaviorTag; label: string }[] = [
    { tag: "healthy", label: "健康" },
    { tag: "active", label: "活躍" },
    { tag: "sweetTooth", label: "甜食" },
    { tag: "clean", label: "潔淨" },
    { tag: "affectionate", label: "親密" },
    { tag: "calm", label: "平靜" },
    { tag: "neglected", label: "需要關心" },
  ];
  return map
    .map((x) => ({
      ...x,
      stars: Math.max(
        1,
        Math.min(3, Math.ceil((save.pet.behaviorTags[x.tag] || 1) / 4)),
      ),
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3);
}
