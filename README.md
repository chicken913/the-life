# The Life

個人生活 app：今日（佳句、習慣、待辦、專注、開銷、作息、運動、日記，可自訂版面）、昨日回顧、專注森林計時、每日五個單字（含語音）、作息與習慣、學習路線、趨勢筆記、週回顧；支援繁體中文與英文。

- 網址：https://chicken913.github.io/the-life/
- 可安裝到手機、平板、電腦主畫面（PWA），離線也能使用
- 用 Google 帳號登入後，資料會存成雲端硬碟裡的 `the-life-data.json`，各裝置自動同步
- app 只使用 `drive.file` 權限：只能存取它自己建立的檔案

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 頁面與樣式 |
| `app.js` | 功能、同步、Google 登入 |
| `config.js` | Google OAuth 用戶端 ID |
| `data-quotes.js` | 每日佳句（中英） |
| `data-vocab.js` | 單字庫（每 5 個一天） |
| `sw.js` | 離線快取 |
| `manifest.webmanifest`、`icons/` | 安裝到主畫面用 |

## Google 登入設定（一次性）

1. 到 Google Cloud Console 建立專案（例如 `simon-life`）
2. 「API 和服務 → 程式庫」啟用 **Google Drive API**
3. 「OAuth 同意畫面」：使用者類型選「外部」，發布狀態維持「測試」，測試使用者加入自己的 Gmail
4. 「憑證 → 建立憑證 → OAuth 用戶端 ID」，類型選「網頁應用程式」
   - 已授權的 JavaScript 來源：`https://chicken913.github.io`
   - 已授權的重新導向 URI：`https://chicken913.github.io/the-life/`
5. 把產生的用戶端 ID 填進 `config.js` 的 `clientId`

用戶端 ID 是公開識別碼，不是密碼，放在公開 repo 沒有安全疑慮。

## 資料格式

`the-life-data.json` 內有 `_about` 欄位說明結構，Claude 可透過 Google Drive 連接器直接讀取並產生回顧報告。
