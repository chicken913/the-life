# Simon Life

思漢待役期間的個人 app：每日作息打勾、行程、六週學習路線、趨勢與市場筆記、週回顧。

- 網址：https://chicken913.github.io/Simon-life/
- 可安裝到手機、平板、電腦主畫面（PWA），離線也能使用
- 用 Google 帳號登入後，資料會存成雲端硬碟裡的 `simon-life-data.json`，各裝置自動同步
- app 只使用 `drive.file` 權限：只能存取它自己建立的檔案

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 頁面與樣式 |
| `app.js` | 功能、同步、Google 登入 |
| `config.js` | Google OAuth 用戶端 ID |
| `sw.js` | 離線快取 |
| `manifest.webmanifest`、`icons/` | 安裝到主畫面用 |

## Google 登入設定（一次性）

1. 到 Google Cloud Console 建立專案（例如 `simon-life`）
2. 「API 和服務 → 程式庫」啟用 **Google Drive API**
3. 「OAuth 同意畫面」：使用者類型選「外部」，發布狀態維持「測試」，測試使用者加入自己的 Gmail
4. 「憑證 → 建立憑證 → OAuth 用戶端 ID」，類型選「網頁應用程式」
   - 已授權的 JavaScript 來源：`https://chicken913.github.io`
   - 已授權的重新導向 URI：`https://chicken913.github.io/Simon-life/`
5. 把產生的用戶端 ID 填進 `config.js` 的 `clientId`

用戶端 ID 是公開識別碼，不是密碼，放在公開 repo 沒有安全疑慮。

## 資料格式

`simon-life-data.json` 內有 `_about` 欄位說明結構，Claude 可透過 Google Drive 連接器直接讀取並產生回顧報告。
