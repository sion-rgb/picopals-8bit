import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { db } from "../db";
import {
  backendForUser,
  firebaseConfigured,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
} from "../firebase";
import {
  clearOfflineCaches,
  downloadOfflineAssets,
  inspectOffline,
  requestPersistentStorage,
  updateOfflineAssets,
  type OfflineCapability,
} from "../offline";
import { resolveConflict, type CloudBackend, type SyncResult } from "../sync";
import type { SaveFile, SyncConflict, SyncLog, SyncState } from "../types";
import { PixelIcon } from "./PixelIcon";

interface Props {
  save: SaveFile;
  state: SyncState | null;
  user: User | null;
  onToggle: (enabled: boolean) => Promise<void> | void;
  onSync: () => Promise<SyncResult>;
  onSave: (save: SaveFile) => void;
  onRefresh: () => void;
  onNotice: (message: string) => void;
  onRestartGuide: () => void;
}
const fmt = (value?: number) =>
  value ? new Date(value).toLocaleString("zh-HK") : "尚未";
const statusLabel: Record<SyncState["status"], string> = {
  "local-only": "只存本機",
  offline: "目前離線",
  idle: "等待同步",
  dirty: "有待同步變更",
  syncing: "同步中",
  synced: "已同步",
  conflict: "需要處理衝突",
  "auth-required": "需要登入",
  error: "同步錯誤",
};
export function SyncPanel({
  save,
  state,
  user,
  onToggle,
  onSync,
  onSave,
  onRefresh,
  onNotice,
  onRestartGuide,
}: Props) {
  const [offline, setOffline] = useState<OfflineCapability | null>(null),
    [logs, setLogs] = useState<SyncLog[]>([]),
    [conflicts, setConflicts] = useState<SyncConflict[]>([]),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [showLogs, setShowLogs] = useState(false),
    [working, setWorking] = useState(false);
  const backend = backendForUser(user);
  const refresh = async () => {
    setOffline(await inspectOffline());
    setLogs(
      await db.syncLogs.orderBy("createdAt").reverse().limit(50).toArray(),
    );
    setConflicts(
      await db.syncConflicts.where("status").anyOf("pending", "kept").toArray(),
    );
    onRefresh();
  };
  useEffect(() => {
    void refresh();
    const online = () => void refresh();
    addEventListener("online", online);
    addEventListener("offline", online);
    return () => {
      removeEventListener("online", online);
      removeEventListener("offline", online);
    };
  }, []);
  const task = async (fn: () => Promise<unknown>, success?: string) => {
    setWorking(true);
    try {
      await fn();
      if (success) onNotice(success);
      await refresh();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setWorking(false);
    }
  };
  const resolve = async (
    conflict: SyncConflict,
    choice: "local" | "cloud" | "keep",
  ) => {
    if (!backend) return onNotice("請先重新登入再處理衝突。");
    if (
      choice !== "keep" &&
      !confirm(
        `將使用${choice === "local" ? "本機" : "雲端"}版本，另一版本會先建立快照。確定繼續？`,
      )
    )
      return;
    await task(
      async () => onSave(await resolveConflict(conflict.id!, choice, backend)),
      choice === "keep" ? "兩個版本已保留，自動同步暫停。" : "衝突已安全處理。",
    );
  };
  return (
    <div className="settings-list v3-settings">
      <section className="sync-section">
        <h3>
          <PixelIcon name="cloud" /> 離線與同步
        </h3>
        <div className="sync-summary">
          <span>
            <PixelIcon name={offline?.online ? "sync" : "offline"} />
            <b>網絡</b>
            <small>{offline?.online ? "已連線" : "目前離線"}</small>
          </span>
          <span>
            <PixelIcon
              name={
                state?.status === "error"
                  ? "warning"
                  : state?.status === "offline"
                    ? "offline"
                    : "sync"
              }
            />
            <b>同步</b>
            <small>{state ? statusLabel[state.status] : "檢查中"}</small>
          </span>
        </div>
        <dl className="capability-grid">
          <div>
            <dt>Service Worker</dt>
            <dd>{offline?.serviceWorker ? "已安裝" : "未安裝"}</dd>
          </div>
          <div>
            <dt>主要資源</dt>
            <dd>{offline?.cached ? "已快取" : "未完成"}</dd>
          </div>
          <div>
            <dt>IndexedDB</dt>
            <dd>{offline?.indexedDb ? "可使用" : "不可使用"}</dd>
          </div>
          <div>
            <dt>Persistent Storage</dt>
            <dd>{offline?.persistent ? "已批准" : "未批准"}</dd>
          </div>
          <div>
            <dt>最後本機儲存</dt>
            <dd>{fmt(state?.lastLocalSaveAt)}</dd>
          </div>
          <div>
            <dt>離線資源版本</dt>
            <dd>{offline?.cacheVersion ?? "檢查中"}</dd>
          </div>
        </dl>
        <div className="button-row wrap">
          <button
            disabled={working}
            onClick={() => void task(downloadOfflineAssets, "離線資源已下載。")}
          >
            下載離線資源
          </button>
          <button disabled={working} onClick={() => void refresh()}>
            重新檢查離線功能
          </button>
          <button
            disabled={working}
            onClick={() => void task(updateOfflineAssets, "已檢查更新。")}
          >
            更新離線資源
          </button>
          <button
            disabled={working}
            onClick={() =>
              void task(requestPersistentStorage, "已重新申請永久儲存空間。")
            }
          >
            申請永久儲存
          </button>
        </div>
        <p className="cache-warning">
          清除前提示：這只會重新下載程式資源，不會刪除萌寵存檔。
        </p>
        <button
          disabled={working}
          className="quiet"
          onClick={() =>
            void task(
              clearOfflineCaches,
              "程式快取已清除；IndexedDB 存檔完整保留。",
            )
          }
        >
          清除離線快取
        </button>
      </section>
      <section className="cloud-section">
        <h3>
          <PixelIcon name="sync" /> 雲端同步
        </h3>
        {!firebaseConfigured ? (
          <div className="service-unavailable">
            <PixelIcon name="warning" />
            <div>
              <b>雲端服務尚未設定</b>
              <p>目前資料只儲存在這部裝置；所有遊戲與離線功能仍可使用。</p>
            </div>
          </div>
        ) : !user ? (
          <>
            <p>
              雲端同步：未開啟
              <br />
              目前資料只儲存在這部裝置。
            </p>
            <div className="button-row wrap">
              <button
                disabled={working}
                onClick={() =>
                  void task(async () => {
                    await loginWithGoogle();
                  }, "Google 登入完成；請選擇是否上傳本機存檔。")
                }
              >
                使用 Google 帳戶同步
              </button>
            </div>
            <div className="email-login">
              <input
                type="email"
                placeholder="電郵"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                minLength={6}
                placeholder="密碼（至少 6 位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                disabled={working || !email || password.length < 6}
                onClick={() =>
                  void task(async () => {
                    await loginWithEmail(email, password);
                  }, "登入成功；尚未上傳任何資料。")
                }
              >
                電郵登入
              </button>
              <button
                disabled={working || !email || password.length < 6}
                onClick={() =>
                  void task(async () => {
                    await loginWithEmail(email, password, true);
                  }, "帳戶已建立；尚未上傳任何資料。")
                }
              >
                建立帳戶
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="account-card">
              <PixelIcon name="heart" />
              <div>
                <b>{user.displayName || "PicoPals 玩家"}</b>
                <span>{user.email}</span>
                <small>
                  裝置：{state?.deviceName}
                  <br />
                  ID：{state?.deviceId.slice(-8)}
                </small>
              </div>
            </div>
            <label className="switch">
              雲端同步
              <input
                type="checkbox"
                checked={Boolean(state?.cloudSyncEnabled)}
                onChange={(e) => void onToggle(e.target.checked)}
              />
              <i />
            </label>
            <dl className="capability-grid">
              <div>
                <dt>最後成功同步</dt>
                <dd>{fmt(state?.lastSuccessfulSyncAt)}</dd>
              </div>
              <div>
                <dt>待同步變更</dt>
                <dd>{state?.pendingChanges ?? 0}</dd>
              </div>
              <div>
                <dt>雲端版本</dt>
                <dd>{state?.lastKnownCloudRevision ?? 0}</dd>
              </div>
              <div>
                <dt>本機版本</dt>
                <dd>{state?.localRevision ?? 0}</dd>
              </div>
              <div>
                <dt>同步狀態</dt>
                <dd>{state ? statusLabel[state.status] : "檢查中"}</dd>
              </div>
              <div>
                <dt>最近錯誤</dt>
                <dd>{state?.lastError ?? "沒有"}</dd>
              </div>
            </dl>
            <div className="button-row wrap">
              <button
                disabled={working || !state?.cloudSyncEnabled}
                onClick={() =>
                  void task(async () => {
                    const result = await onSync();
                    onNotice(result.message);
                  }, undefined)
                }
              >
                立即同步
              </button>
              <button
                disabled={working || !state?.cloudSyncEnabled}
                onClick={() =>
                  void task(async () => {
                    const result = await onSync();
                    onNotice(result.message);
                  }, undefined)
                }
              >
                從雲端重新檢查
              </button>
              <button onClick={() => setShowLogs((x) => !x)}>
                查看同步紀錄
              </button>
              <button onClick={() => void onToggle(false)}>關閉雲端同步</button>
              <button
                onClick={() =>
                  void task(async () => {
                    await logoutFirebase();
                    await onToggle(false);
                  }, "已登出，本機存檔完整保留。")
                }
              >
                登出
              </button>
              <button
                className="danger"
                disabled={!backend}
                onClick={() => {
                  if (
                    confirm("刪除雲端存檔？本機資料不會刪除。") &&
                    confirm("最後確認：只刪除目前帳戶的雲端副本？")
                  )
                    void task(
                      () => backend!.deleteSave(),
                      "雲端副本已刪除，本機存檔仍在。",
                    );
                }}
              >
                刪除雲端存檔
              </button>
            </div>
          </>
        )}
        {showLogs && (
          <div className="sync-log">
            {logs.length ? (
              logs.map((x) => (
                <div key={x.id}>
                  <b>{x.type}</b>
                  <span>{x.summary}</span>
                  <time>{fmt(x.createdAt)}</time>
                </div>
              ))
            ) : (
              <p>尚未有同步紀錄。</p>
            )}
          </div>
        )}
      </section>
      {conflicts.map((c) => (
        <section className="conflict-card" key={c.id}>
          <h3>發現兩個不同的萌寵存檔</h3>
          <div className="conflict-compare">
            <Version
              label="本機版本"
              save={c.localSave}
              revision={c.localRevision}
            />
            <Version
              label="雲端版本"
              save={c.cloudSave}
              revision={c.cloudRevision}
            />
          </div>
          <div className="button-row wrap">
            <button onClick={() => void resolve(c, "local")}>
              使用本機版本
            </button>
            <button onClick={() => void resolve(c, "cloud")}>
              使用雲端版本
            </button>
            <button onClick={() => void resolve(c, "keep")}>
              暫時保留兩個版本
            </button>
          </div>
        </section>
      ))}
      <section>
        <h3>版本與隱私</h3>
        <p>
          PicoPals v3.0.0 · Schema v{save.schemaVersion}
          <br />
          Firebase Token、UID、私密金鑰與完整 User Agent 永不寫入遊戲存檔或 JSON
          匯出。
        </p>
        <div className="button-row">
          <a
            className="button-link"
            href={`${import.meta.env.BASE_URL}CHANGELOG.md`}
          >
            更新內容
          </a>
          <a
            className="button-link"
            href="https://github.com/sion-rgb/picopals-8bit/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            開源授權
          </a>
          <button onClick={onRestartGuide}>重新觀看首次引導</button>
        </div>
      </section>
    </div>
  );
}
function Version({
  label,
  save,
  revision,
}: {
  label: string;
  save: SaveFile;
  revision: number;
}) {
  return (
    <article>
      <h4>{label}</h4>
      <dl>
        <div>
          <dt>寵物名稱</dt>
          <dd>{save.pet.name}</dd>
        </div>
        <div>
          <dt>成長階段</dt>
          <dd>{save.pet.stage}</dd>
        </div>
        <div>
          <dt>最後更新</dt>
          <dd>{fmt(save.game.lastSavedAt)}</dd>
        </div>
        <div>
          <dt>星星幣</dt>
          <dd>{save.game.coins}</dd>
        </div>
        <div>
          <dt>世代</dt>
          <dd>{save.game.generation}</dd>
        </div>
        <div>
          <dt>最終形態</dt>
          <dd>{save.pet.speciesId}</dd>
        </div>
        <div>
          <dt>遊戲時數</dt>
          <dd>{Math.floor(save.pet.ageMinutes / 60)}</dd>
        </div>
        <div>
          <dt>圖鑑數量</dt>
          <dd>{save.album.length}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>{revision}</dd>
        </div>
      </dl>
    </article>
  );
}
export const backendFromUser = (user: User | null): CloudBackend | null =>
  backendForUser(user);
