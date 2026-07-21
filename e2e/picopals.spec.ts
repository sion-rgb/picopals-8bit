import { expect, test, type Page } from "@playwright/test";
async function start(page: Page, testMode = false) {
  await page.goto(testMode ? "/?testMode=1" : "/");
  await page.getByRole("button", { name: /開始孵蛋/ }).click();
  await expect(page.getByText(/正在等你/)).toBeVisible();
}
async function setPet(page: Page, changes: Record<string, unknown>) {
  await page.goto("/offline.html");
  await page.evaluate(
    async (changes) =>
      await new Promise<void>((resolve, reject) => {
        const q = indexedDB.open("PicoPalsDB");
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction("pets", "readwrite"),
            store = tx.objectStore("pets"),
            get = store.getAll();
          get.onsuccess = () => store.put({ ...get.result[0], ...changes });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        q.onerror = () => reject(q.error);
      }),
    changes,
  );
  await page.goto("/");
}

test("六種尺寸均固定顯示 4×2 操作矩陣且沒有橫向捲動", async ({ page }) => {
  await start(page);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const grid = page.locator(".pet-action-grid"),
      buttons = grid.getByRole("button"),
      boxes = await buttons.evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            visible: r.width > 0 && r.height > 0,
          };
        }),
      ),
      layout = await grid.evaluate((e) => {
        const s = getComputedStyle(e);
        return {
          display: s.display,
          columns: s.gridTemplateColumns,
          overflowX: s.overflowX,
          scrollSnapType: s.scrollSnapType,
        };
      });
    expect(layout.display).toBe("grid");
    expect(layout.columns.split(" ")).toHaveLength(4);
    expect(layout.overflowX).toBe("visible");
    expect(layout.scrollSnapType).toBe("none");
    expect(await buttons.count()).toBe(8);
    expect(
      boxes.every((b) => b.visible && b.width >= 44 && b.height >= 44),
    ).toBe(true);
    expect(new Set(boxes.slice(0, 4).map((b) => Math.round(b.y))).size).toBe(1);
    expect(new Set(boxes.slice(4).map((b) => Math.round(b.y))).size).toBe(1);
    expect(boxes[4]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(Math.abs(boxes[4]!.x - boxes[0]!.x)).toBeLessThan(2);
    expect(await grid.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    );
    expect(
      await grid.evaluate((e) => getComputedStyle(e, "::after").content),
    ).toBe("none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.getByRole("button", { name: /^[ABC]$/ })).toHaveCount(0);
  await expect(page.locator("kbd")).toHaveCount(0);
});
test("鍵盤方向鍵按照 4×2 矩陣移動焦點", async ({ page }) => {
  await start(page);
  const buttons = page.locator(".pet-action-grid button");
  await buttons.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(buttons.nth(5)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(buttons.nth(4)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(buttons.nth(0)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "星光餐桌" })).toBeVisible();
  await expect(buttons.nth(0)).toHaveClass(/selected/);
  await expect(buttons.nth(0)).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: /正在等你/ })).toBeVisible();
});
test("不可使用的功能保持可見並提供原因", async ({ page }) => {
  await start(page);
  await setPet(page, {
    energy: 3,
    stage: "baby",
    speciesId: "pomu",
    nextEvolutionAt: Date.now() + 99999999,
  });
  const play = page.getByRole("button", { name: "遊玩" });
  await expect(play).toBeVisible();
  await expect(play).toBeDisabled();
  await expect(play).toHaveAttribute("title", /精力不足/);
  await page.getByRole("button", { name: "社交" }).click();
  const proposal = page.getByRole("button", { name: /求婚/ });
  await expect(proposal).toBeVisible();
  await expect(proposal).toBeDisabled();
  await expect(proposal).toHaveAttribute("title", /尚未成年/);
});
test("餵飼後自動返回房間並在動畫完成前鎖定操作", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "餵飼" }).click();
  await page
    .getByRole("button", { name: /餵飼 · 還有/ })
    .first()
    .click();
  await expect(page.locator(".device")).toHaveAttribute("data-busy", "true");
  await expect(page.getByText(/正在等你/)).toBeVisible();
  await expect(page.getByRole("button", { name: "遊玩" })).toBeDisabled();
  await expect(page.locator(".device")).toHaveAttribute("data-busy", "false", {
    timeout: 5000,
  });
  await expect(page.getByText(/飽足 \+/)).toBeVisible();
});
test("清理穢物、小掃帚與泡泡澡各自返回房間播放動畫", async ({ page }) => {
  await start(page);
  await setPet(page, { poopCount: 3 });
  for (const name of ["清理穢物", "小掃帚", "泡泡澡"]) {
    await page.getByRole("button", { name: "清潔" }).click();
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await expect(page.locator(".device")).toHaveAttribute("data-busy", "true");
    await expect(page.getByText(/正在等你/)).toBeVisible();
    await expect(page.locator(".device")).toHaveAttribute(
      "data-busy",
      "false",
      { timeout: 5000 },
    );
  }
});
test("NPC 造型會跟隨玩家階段改變", async ({ page }) => {
  await start(page, true);
  await page.getByRole("button", { name: "社交" }).click();
  await expect(page.locator('[data-npc="aro-adult"]').first()).toBeVisible();
  await page.getByRole("button", { name: "返回主畫面" }).click();
  await setPet(page, {
    stage: "teen",
    speciesId: "ribbonbun",
    nextEvolutionAt: Date.now() + 99999999,
  });
  await page.getByRole("button", { name: "社交" }).click();
  await expect(page.locator('[data-npc="aro-teen"]').first()).toBeVisible();
});
test("商店商品可購買並在正確位置使用", async ({ page }) => {
  await start(page, true);
  await page.getByRole("button", { name: "商店" }).click();
  await page.getByRole("button", { name: "照顧與裝飾" }).click();
  await page.getByRole("button", { name: "◆ 30" }).click();
  await expect(page.getByText(/永久裝飾已解鎖/)).toBeVisible();
  await page.getByRole("button", { name: "返回主畫面" }).click();
  await page.getByRole("button", { name: "背包" }).click();
  await page.getByRole("button", { name: /花園牆紙/ }).click();
  await expect(page.getByRole("button", { name: /花園牆紙/ })).toContainText(
    "已裝備",
  );
  await page.getByRole("button", { name: /放房間/ }).click();
  await expect(page.getByText(/已放進房間/)).toBeVisible();
});
test("健康時藥盒停用，生病後可使用", async ({ page }) => {
  await start(page, true);
  await page.getByRole("button", { name: "查詢" }).click();
  await expect(page.getByRole("button", { name: "使用星光藥盒" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "返回主畫面" }).click();
  await setPet(page, {
    isSick: true,
    sicknessType: "感冒",
    sickSince: Date.now(),
  });
  await page.getByRole("button", { name: "查詢" }).click();
  await page.getByRole("button", { name: "使用星光藥盒" }).click();
  await expect(page.getByText(/精神好多了/)).toBeVisible();
});
test("圖鑑與主畫面使用相同角色 id 與共用預覽", async ({ page }) => {
  await start(page, true);
  const mainId = await page
    .locator(".pet-canvas")
    .getAttribute("data-sprite-id");
  await page.getByRole("button", { name: "背包" }).click();
  await page.getByRole("button", { name: "玫瑰公主兔" }).click();
  await expect(
    page.locator(`.species-preview[data-sprite-id="${mainId}"]`).first(),
  ).toBeVisible();
});
test("朋友同玩必須消耗代幣並完成現有小遊戲", async ({ page }) => {
  await start(page, true);
  await page.getByRole("button", { name: "社交" }).click();
  await page.getByRole("button", { name: /朋友同玩/ }).click();
  await expect(
    page.getByRole("heading", { name: "朋友同玩模式" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /星星記憶牌/ }).click();
  await expect(page.getByRole("heading", { name: "星星記憶牌" })).toBeVisible();
  await expect(page.locator('[data-npc="aro-adult"]')).toBeVisible();
});
test("離去後可重生且保留帳戶型資料", async ({ page }) => {
  await start(page, true);
  await setPet(page, {
    isAlive: false,
    departedAt: Date.now(),
    departureReason: "natural",
  });
  await expect(page.getByText(/化成溫柔星光/)).toBeVisible();
  await page.getByRole("button", { name: /孵化第 2 代/ }).click();
  await expect(page.getByText("GENERATION 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /開始孵蛋/ }).click();
  await expect(page.getByText(/正在等你/)).toBeVisible();
});
test("舊 Schema 1 IndexedDB 可自動無損升級", async ({ page }) => {
  await page.goto("/offline.html");
  await page.evaluate(async () => {
    await new Promise<void>((r) => {
      const d = indexedDB.deleteDatabase("PicoPalsDB");
      d.onsuccess = () => r();
      d.onerror = () => r();
    });
    await new Promise<void>((resolve, reject) => {
      const q = indexedDB.open("PicoPalsDB", 1);
      q.onupgradeneeded = () => {
        const db = q.result;
        db.createObjectStore("pets", { keyPath: "id" }).createIndex(
          "lastUpdatedAt",
          "lastUpdatedAt",
        );
        db.createObjectStore("gameState", { keyPath: "id" });
        db.createObjectStore("inventory", { keyPath: "id" });
        db.createObjectStore("activityLogs", {
          keyPath: "id",
          autoIncrement: true,
        });
        db.createObjectStore("npcRelationships", { keyPath: "npcId" });
        db.createObjectStore("achievements", { keyPath: "id" });
        db.createObjectStore("evolutionAlbum", { keyPath: "id" });
        db.createObjectStore("settings", { keyPath: "id" });
        db.createObjectStore("saveSnapshots", {
          keyPath: "id",
          autoIncrement: true,
        });
      };
      q.onsuccess = () => {
        const db = q.result,
          tx = db.transaction(
            [
              "pets",
              "gameState",
              "inventory",
              "npcRelationships",
              "achievements",
              "evolutionAlbum",
              "settings",
            ],
            "readwrite",
          ),
          now = Date.now();
        tx.objectStore("pets").add({
          id: "legacy",
          name: "舊朋友",
          speciesId: "pomu",
          stage: "baby",
          personality: "平靜",
          birthAt: now - 3600000,
          lastUpdatedAt: now,
          ageMinutes: 60,
          health: 88,
          fullness: 70,
          happiness: 77,
          cleanliness: 80,
          energy: 66,
          affection: 45,
          weight: 3.2,
          idealWeightMin: 3,
          idealWeightMax: 4,
          poopCount: 0,
          isSick: false,
          isSleeping: false,
          isAlive: true,
          careMistakes: 0,
          mealsToday: 1,
          snacksToday: 0,
          gamesPlayedToday: 2,
          giftsReceived: 0,
          behaviorTags: {
            active: 1,
            sweetTooth: 0,
            healthy: 1,
            clean: 1,
            affectionate: 1,
            calm: 1,
            neglected: 0,
          },
        });
        tx.objectStore("gameState").add({
          id: "main",
          coins: 432,
          lastSavedAt: now,
          highScores: { catch: 12 },
          weightHistory: [],
          generation: 3,
          clockAnomalies: 0,
          history: [],
        });
        tx.objectStore("inventory").add({
          id: "gift:plant",
          itemId: "plant",
          quantity: 2,
        });
        tx.objectStore("npcRelationships").add({
          npcId: "aro",
          affection: 44,
          gifts: [],
        });
        tx.objectStore("achievements").add({ id: "old", value: true });
        tx.objectStore("evolutionAlbum").add({ id: "pomu", value: true });
        tx.objectStore("settings").add({ id: "theme", value: "lcd" });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      q.onerror = () => reject(q.error);
    });
  });
  await page.goto("/");
  await expect(page.getByText("舊朋友", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "設定" }).click();
  await expect(page.getByText(/目前資料版本：Schema v3/)).toBeVisible();
  const migrated = await page.evaluate(
    () =>
      new Promise<{ version: number; schema: number; coins: number }>((r) => {
        const q = indexedDB.open("PicoPalsDB");
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction(["settings", "gameState"]),
            meta = tx.objectStore("settings").get("__saveMeta"),
            game = tx.objectStore("gameState").get("main");
          tx.oncomplete = () => {
            r({
              version: db.version,
              schema: meta.result.value.schemaVersion,
              coins: game.result.coins,
            });
            db.close();
          };
        };
      }),
  );
  expect(migrated).toEqual({ version: 30, schema: 3, coins: 432 });
});
test("手機直向版沒有橫向頁面溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("下載離線資源後斷線仍可餵食並於重新整理後保留存檔", async ({
  page,
  context,
}) => {
  await start(page);
  const name = await page.locator(".screen-caption b").textContent();
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "下載離線資源" }).click();
  await expect(page.getByText(/離線資源已下載/)).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "餵飼" }).click();
  await page
    .getByRole("button", { name: /餵飼 · 還有/ })
    .first()
    .click();
  await expect(page.locator(".device")).toHaveAttribute("data-busy", "false", {
    timeout: 5000,
  });
  await page.reload();
  await expect(page.locator(".screen-caption b")).toHaveText(name ?? "波波");
  await context.setOffline(false);
});

test("設定頁完整顯示離線能力與未設定 Firebase 的誠實降級", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "設定" }).click();
  await expect(page.getByRole("heading", { name: /離線與同步/ })).toBeVisible();
  await expect(page.getByText("IndexedDB", { exact: true })).toBeVisible();
  await expect(page.getByText(/雲端服務尚未設定/)).toBeVisible();
  await expect(page.getByText(/目前資料只儲存在這部裝置/)).toBeVisible();
});

test("雙版本衝突介面並排顯示且可暫時保留兩個版本", async ({ page }) => {
  await start(page, true);
  await page.evaluate(
    async () =>
      new Promise<void>((resolve, reject) => {
        const q = indexedDB.open("PicoPalsDB");
        q.onsuccess = () => {
          const database = q.result;
          const read = database.transaction(
            [
              "pets",
              "gameState",
              "inventory",
              "npcRelationships",
              "evolutionAlbum",
              "achievements",
              "settings",
            ],
            "readonly",
          );
          const requests = {
            pet: read.objectStore("pets").getAll(),
            game: read.objectStore("gameState").get("main"),
            inventory: read.objectStore("inventory").getAll(),
            relationships: read.objectStore("npcRelationships").getAll(),
            album: read.objectStore("evolutionAlbum").getAll(),
            achievements: read.objectStore("achievements").getAll(),
            settings: read.objectStore("settings").getAll(),
          };
          read.oncomplete = () => {
            const rows = requests.settings.result,
              meta = rows.find(
                (x: { id: string }) => x.id === "__saveMeta",
              ).value,
              settings = Object.fromEntries(
                rows
                  .filter((x: { id: string }) => x.id !== "__saveMeta")
                  .map((x: { id: string; value: unknown }) => [x.id, x.value]),
              ),
              save = {
                schemaVersion: 3,
                exportedAt: Date.now(),
                pet: requests.pet.result[0],
                game: requests.game.result,
                inventory: requests.inventory.result,
                relationships: requests.relationships.result,
                album: requests.album.result.map((x: { id: string }) => x.id),
                achievements: requests.achievements.result.map(
                  (x: { id: string }) => x.id,
                ),
                settings,
                ...meta,
              };
            const write = database.transaction(
              ["syncConflicts", "syncState"],
              "readwrite",
            );
            write.objectStore("syncConflicts").add({
              createdAt: Date.now(),
              status: "pending",
              localRevision: 2,
              cloudRevision: 3,
              localSave: save,
              cloudSave: {
                ...save,
                game: { ...save.game, coins: save.game.coins + 25 },
              },
            });
            const stateGet = write.objectStore("syncState").get("main");
            stateGet.onsuccess = () =>
              write
                .objectStore("syncState")
                .put({ ...stateGet.result, status: "conflict" });
            write.oncomplete = () => {
              database.close();
              resolve();
            };
            write.onerror = () => reject(write.error);
          };
          read.onerror = () => reject(read.error);
        };
        q.onerror = () => reject(q.error);
      }),
  );
  await page.reload();
  await page.getByRole("button", { name: "設定" }).click();
  await expect(
    page.getByRole("heading", { name: /發現兩個不同/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "本機版本" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "雲端版本" })).toBeVisible();
  await page.getByRole("button", { name: "暫時保留兩個版本" }).click();
  await expect(page.getByText(/自動同步暫停/)).toBeVisible();
});

test("每日任務三項完成後獎勵只可領取一次", async ({ page }) => {
  await start(page);
  await page.evaluate(
    async () =>
      new Promise<void>((resolve, reject) => {
        const q = indexedDB.open("PicoPalsDB");
        q.onsuccess = () => {
          const database = q.result,
            tx = database.transaction("settings", "readwrite"),
            store = tx.objectStore("settings"),
            get = store.get("__saveMeta");
          get.onsuccess = () => {
            const value = get.result.value;
            store.put({
              id: "__saveMeta",
              value: {
                ...value,
                dailyMissions: {
                  ...value.dailyMissions,
                  missions: value.dailyMissions.missions.map(
                    (mission: Record<string, unknown>) => ({
                      ...mission,
                      completed: true,
                      progress: 1,
                    }),
                  ),
                },
              },
            });
          };
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        q.onerror = () => reject(q.error);
      }),
  );
  await page.reload();
  const claim = page.getByRole("button", { name: "領取全部完成獎勵" });
  await claim.click();
  await expect(
    page.getByRole("button", { name: "今日獎勵已領取" }),
  ).toBeDisabled();
});

test("首次引導可跳過重看，朋友圈貼文可回應", async ({ page }) => {
  await start(page, true);
  await expect(page.locator(".onboarding-guide")).toBeVisible();
  await page.getByRole("button", { name: "跳過" }).click();
  await expect(page.locator(".onboarding-guide")).toHaveCount(0);
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "重新觀看首次引導" }).click();
  await page.getByRole("button", { name: "返回主畫面" }).click();
  await expect(page.locator(".onboarding-guide")).toBeVisible();
  await page.getByRole("button", { name: "社交" }).click();
  const post = page.locator(".social-feed article").first();
  await expect(post).toBeVisible();
  await post.getByRole("button", { name: "回應" }).click();
  await expect(post.getByRole("button", { name: "已回應" })).toBeDisabled();
});
