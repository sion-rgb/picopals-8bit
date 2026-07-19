# PicoPals 8-Bit

A cute original 8-bit virtual pet Progressive Web App.

## Play Now

[Play PicoPals 8-Bit](https://sion-rgb.github.io/picopals-8bit/)

![PicoPals 8-Bit game screen](public/screenshot.png)

## 遊戲簡介

PicoPals 8-Bit／像素萌寵日記是一款以繁體中文（香港用語）製作、支援手機與電腦的原創電子寵物遊戲。領養星塵蛋，透過餵食、清潔、遊玩與陪伴，引導萌寵走向 20 種不同的可愛進化形態。

所有角色輪廓、像素畫面與 8-bit 音效均由專案程式原創生成，沒有使用既有電子寵物品牌素材。

## 主要功能

- IndexedDB 自動存檔、30 秒定時儲存、離線成長摘要及時鐘倒退保護
- 飽足、心情、健康、清潔、精力、親密、體重、疾病、睡眠與穢物系統
- 20 種原創成長形態及資料驅動進化分支
- 三款真正可操作的小遊戲：接住愛心、星星記憶牌、跳跳緞帶
- 餐點、零食、禮物、藥物與房間裝飾商店
- 六位模擬 NPC、送禮、約會感情階段、求婚與結婚
- JSON 匯出／匯入、匯入前快照、上一個快照恢復及二次確認重設
- 五款機身主題、音量、易讀字體、高對比、鍵盤及觸控操作
- 可安裝 PWA、離線 App Shell、Service Worker 更新提示及自選通知
- 無廣告、無課金、無抽卡、無帳戶、無外部資料庫

## 安裝 PWA

1. 使用 Chrome、Edge 或支援安裝 PWA 的手機瀏覽器開啟可玩網址。
2. 在遊戲「設定」選擇「安裝 PicoPals」，或使用瀏覽器選單的「安裝應用程式／加入主畫面」。
3. 安裝後可由桌面或手機主畫面啟動。首次完整載入後，主要遊戲可離線開啟。

## 本機啟動

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

開啟終端顯示的本機網址。其他可用指令：

```bash
npm run test
npm run test:e2e
npm run build
npm run preview
```

端對端測試首次執行前，請安裝 Playwright Chromium：

```bash
npx playwright install chromium
```

## GitHub Pages 部署

每次推送到 `main`，`.github/workflows/deploy-pages.yml` 會使用 Node.js 22 安裝依賴、執行單元測試、建立 Vite production build，然後部署 `dist/` 到 GitHub Pages。Vite 在 GitHub Actions 中自動使用 `/picopals-8bit/` base path；Manifest 與 Service Worker 皆使用 PWA scope 相對路徑。

## 測試

Vitest 覆蓋餵食、數值邊界、體重、零食風險、清潔、生病、離線推進、時鐘異常、進化、經濟、送禮、結婚、紀念冊、IndexedDB 與 JSON schema 驗證。Playwright 覆蓋首次孵蛋、餵食、清潔、重新整理存檔、三款小遊戲、匯出存檔、桌面／手機溢出及結婚測試模式。

## 隱私

- 遊戲不需要帳戶，也不連接 AI API。
- 遊戲資料主要儲存在玩家裝置的瀏覽器 IndexedDB。
- 開發者不會自動取得玩家存檔或遊戲內容。
- 清除瀏覽器網站資料、無痕模式結束或瀏覽器儲存政策可能刪除存檔。
- 建議玩家定期在「設定」使用 JSON 匯出功能備份。
- 選擇開啟瀏覽器通知前，遊戲不會要求通知權限。

## 授權與第三方資源

原創專案程式以 [MIT License](LICENSE) 發佈。第三方套件及資源說明見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 與 `public/licenses/`。
