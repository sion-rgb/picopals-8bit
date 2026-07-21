import { bySpecies, npcs } from "../data";
import { growthTendencies, onboardingSteps } from "../progression";
import type { SaveFile } from "../types";
import { NpcPreviewCanvas } from "./SpeciesPreviewCanvas";
import { PixelIcon } from "./PixelIcon";

export function GrowthHint({ save }: { save: SaveFile }) {
  const p = save.pet,
    next = p.nextEvolutionAt ? Math.max(0, p.nextEvolutionAt - Date.now()) : 0,
    stage = {
      egg: "蛋",
      baby: "嬰兒",
      child: "幼兒",
      teen: "青少年",
      adult: "成年",
    }[p.stage],
    nextStage = {
      egg: "嬰兒",
      baby: "幼兒",
      child: "青少年",
      teen: "成年",
      adult: "最終形態",
    }[p.stage];
  return (
    <section className="growth-card" data-testid="growth-hint">
      <header>
        <PixelIcon name="evolution" />
        <div>
          <small>下一次成長</small>
          <b>
            {stage} → {nextStage}
          </b>
        </div>
      </header>
      <p>
        {p.stage === "adult"
          ? "已進入穩定的成年旅程"
          : `約 ${next < 3600000 ? Math.max(1, Math.ceil(next / 60000)) + " 分鐘" : Math.ceil(next / 3600000) + " 小時"}後`}
      </p>
      <div className="tendency-list">
        {growthTendencies(save).map((x) => (
          <span key={x.tag}>
            {x.label}
            <i>
              {Array.from({ length: x.stars }, (_, i) => (
                <b key={i} />
              ))}
            </i>
          </span>
        ))}
      </div>
      <small>最近傾向會影響成長方向，但不會顯示完整公式。</small>
    </section>
  );
}
export function DailyMissions({
  save,
  onClaim,
}: {
  save: SaveFile;
  onClaim: () => void;
}) {
  const daily = save.dailyMissions,
    done = daily.missions.filter((x) => x.completed).length;
  return (
    <section className="mission-card" data-testid="daily-missions">
      <header>
        <PixelIcon name="gift" />
        <div>
          <small>每日星光任務 · 香港時間</small>
          <b>
            {done}/3 已完成 · 連續 {daily.streak} 日
          </b>
        </div>
      </header>
      {daily.missions.map((m) => (
        <div className="mission-row" key={m.id}>
          <i className={m.completed ? "done" : ""} />
          <span>
            <b>{m.title}</b>
            <small>
              {m.progress}/{m.target}
            </small>
          </span>
        </div>
      ))}
      <button disabled={daily.claimed || done < 3} onClick={onClaim}>
        {daily.claimed ? "今日獎勵已領取" : "領取全部完成獎勵"}
      </button>
    </section>
  );
}
export function OnboardingGuide({
  save,
  onSkip,
  onRestart,
  onStep,
}: {
  save: SaveFile;
  onSkip: () => void;
  onRestart: () => void;
  onStep: (step: string) => void;
}) {
  const p = save.onboardingProgress;
  if (!p.active) return null;
  const step = onboardingSteps[Math.min(p.step, onboardingSteps.length - 1)]!,
    labels: Record<string, string> = {
      name: "為萌寵改名",
      hatch: "等待星塵蛋孵化",
      status: "查看萌寵狀態",
      feed: "餵第一餐",
      clean: "清潔房間",
      game: "玩第一個小遊戲",
      pet: "撫摸萌寵",
      friend: "認識第一位星光朋友",
      growth: "查看成長提示",
      offline: "了解離線存檔",
    };
  return (
    <aside className="onboarding-guide" aria-live="polite">
      <div>
        <small>首次引導 {p.step + 1}/10</small>
        <b>{labels[step]}</b>
        <span>完成後獲得新手星光緞帶與 10 星星幣。</span>
      </div>
      <button onClick={() => onStep(step)}>我已了解</button>
      <button className="quiet" onClick={onSkip}>
        跳過
      </button>
    </aside>
  );
}
export function SocialFeed({
  save,
  onReply,
  onGift,
  onPlay,
}: {
  save: SaveFile;
  onReply: (id: string) => void;
  onGift: (npcId: string) => void;
  onPlay: (npcId: string) => void;
}) {
  return (
    <div className="social-feed" data-testid="social-feed">
      {save.socialFeed.posts.map((post) => {
        const npc = npcs.find((x) => x.id === post.npcId)!;
        return (
          <article key={post.id}>
            <header>
              <NpcPreviewCanvas
                npcId={npc.id}
                stage={save.npcProgress[npc.id]?.stage ?? "baby"}
                size={58}
              />
              <div>
                <b>{npc.name}</b>
                <small>
                  {post.scene} · {post.mood}
                </small>
              </div>
            </header>
            <p>「{post.message}」</p>
            <div>
              <button disabled={post.replied} onClick={() => onReply(post.id)}>
                {post.replied ? "已回應" : "回應"}
              </button>
              <button onClick={() => onGift(npc.id)}>送禮</button>
              {post.actions.includes("play") && (
                <button onClick={() => onPlay(npc.id)}>一起玩</button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
export const speciesName = (id: string) => bySpecies(id).name;
