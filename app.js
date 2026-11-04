/* Simon Life — 獨立版 PWA
 * 資料：本機 localStorage（離線可用）＋ Google 雲端硬碟中的 simon-life-data.json（跨裝置同步）
 * 登入：Google OAuth（僅 drive.file 權限：只能存取本 app 自己建立的檔案）
 */
(function () {
"use strict";

/* ---------- helpers ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseYmd = s => { const p = String(s || "").split("-").map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const WD = "日一二三四五六";
const md = d => (d.getMonth() + 1) + "/" + pad(d.getDate());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const dayType = d => { const w = d.getDay(); return (w === 0 || w === 6) ? "wkd" : (w === 2 || w === 4) ? "tt" : "mwf"; };
const DT = { mwf: "一三五", tt: "二四", wkd: "週末" };
const toMin = t => { if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null; const p = t.split(":").map(Number); return p[0] * 60 + p[1]; };
const fmtMin = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + "-W" + pad(w); }
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const fmtTime = ms => { if (!ms) return "—"; const d = new Date(ms); return md(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="var(--surface)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TAGS = ["作息", "學習", "興趣", "運動", "生活", "娛樂"];
const TRACK = { main: "主線", side: "副線", int: "興趣" };
const VIEWS = ["today", "schedule", "learn", "notes", "review", "settings"];
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- defaults ---------- */
let _n = 0; const B = (s, e, l, t) => ({ id: "b" + (++_n), start: s, end: e, label: l, tag: t });
const DEFAULT_SETTINGS = {
  enlist: { date: "", note: "最快 11 月，最晚 12 月" },
  schedule: {
    mwf: [B("08:00", "08:15", "起床、曬太陽", "作息"), B("08:15", "08:45", "晨間趨勢簡報", "興趣"), B("09:00", "11:00", "半導體主線", "學習"), B("11:00", "12:00", "雜事、入伍資訊", "生活"), B("12:00", "14:00", "午餐、短午睡", "生活"), B("14:00", "15:30", "趨勢與市場深度研究", "興趣"), B("16:30", "17:30", "練鋼琴", "生活"), B("18:00", "19:00", "晚餐", "生活"), B("19:00", "20:00", "投籃＋前後拉伸", "運動"), B("20:00", "20:30", "回家直接洗澡，手機不進浴室", "作息"), B("20:30", "22:30", "娛樂時間", "娛樂"), B("23:00", "23:30", "手機下班，看書或聽音樂", "作息"), B("23:30", "", "睡覺", "作息")],
    tt: [B("08:00", "08:15", "起床、曬太陽", "作息"), B("08:15", "08:45", "晨間趨勢簡報", "興趣"), B("09:00", "11:00", "半導體主線", "學習"), B("11:00", "12:00", "雜事、入伍資訊", "生活"), B("12:00", "14:00", "午餐、短午睡", "生活"), B("14:00", "15:30", "半導體副線＋英文", "學習"), B("16:30", "17:30", "彈性時間／加練鋼琴", "生活"), B("18:00", "19:00", "晚餐", "生活"), B("19:00", "20:00", "跑步＋徒手肌力", "運動"), B("20:00", "20:30", "回家直接洗澡，手機不進浴室", "作息"), B("20:30", "22:30", "娛樂時間", "娛樂"), B("23:00", "23:30", "手機下班，看書或聽音樂", "作息"), B("23:30", "", "睡覺", "作息")],
    wkd: [B("09:00", "09:30", "起床、曬太陽", "作息"), B("10:00", "12:00", "自由時間", "娛樂"), B("14:00", "17:00", "外出活動（見朋友、爬山、騎車）", "生活"), B("18:00", "19:00", "晚餐", "生活"), B("19:00", "20:00", "長距離慢跑（擇一天）", "運動"), B("20:00", "20:30", "洗澡", "作息"), B("20:30", "23:30", "娛樂時間", "娛樂"), B("00:00", "", "手機下班、睡覺", "作息")]
  },
  habits: [
    { id: "wake", label: "固定時間起床、曬太陽", days: ["mwf", "tt", "wkd"] },
    { id: "brief", label: "晨間趨勢 30 分鐘", days: ["mwf", "tt"] },
    { id: "main", label: "半導體主線 2 小時", days: ["mwf", "tt"] },
    { id: "pm", label: "下午學習時段", days: ["mwf", "tt"] },
    { id: "piano", label: "練鋼琴", days: ["mwf"] },
    { id: "move", label: "運動（投籃／跑步／肌力）", days: ["mwf", "tt"] },
    { id: "shower", label: "回家先洗澡，手機不進浴室", days: ["mwf", "tt", "wkd"] },
    { id: "off", label: "手機準時下班", days: ["mwf", "tt", "wkd"] }
  ],
  topics: ["AI", "區塊鏈", "國際政治", "總經市場", "半導體", "其他"]
};
const I = (text, track) => ({ id: "i" + (++_n), text, track, done: false });
const DEFAULT_ROADMAP = { start: "2026-11-02", weeks: [
  { id: "w1", items: [I("半導體製程總覽", "main"), I("晶圓製造流程（前段到後段）", "main"), I("建立作息：固定起床＋回家先洗澡", "side"), I("AI 產業與算力需求", "int")] },
  { id: "w2", items: [I("微影", "main"), I("蝕刻", "main"), I("碩論一頁式研究摘要初稿", "side"), I("區塊鏈應用與監管", "int")] },
  { id: "w3", items: [I("薄膜沉積（CVD／PVD／ALD）", "main"), I("CMP 化學機械研磨", "main"), I("SPC 統計製程管制基礎", "side"), I("地緣政治與半導體出口管制", "int")] },
  { id: "w4", items: [I("離子佈植", "main"), I("擴散與熱製程", "main"), I("DOE 與 FMEA 概念", "side"), I("總體經濟與央行政策", "int")] },
  { id: "w5", items: [I("後段封裝製程", "main"), I("先進封裝（CoWoS、Fan-out、Chiplet）", "main"), I("研究摘要定稿", "side"), I("AI 與半導體供應鏈", "int")] },
  { id: "w6", items: [I("總複習，整理成自己的筆記", "main"), I("入伍前準備清單", "side"), I("自選主題", "int")] }
] };

/* ---------- local store ---------- */
const LS = { data: "simonlife.data.v1", meta: "simonlife.meta.v1", auth: "simonlife.auth.v1", state: "simonlife.oauthstate", ret: "simonlife.returnview" };
const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
const ABOUT = "Simon Life app 的資料檔。settings=作息與習慣設定；roadmap=學習路線；days=每日紀錄（以日期為鍵：habits 習慣完成、wake 起床、sleep 前一晚入睡、tasks 當日任務、ex 運動、energy 精神 1-5、note 一句話）；notes=趨勢與市場筆記（deleted=true 表示已刪除）；reviews=每週回顧（以 ISO 週為鍵）。updatedAt 為毫秒時間戳，用於跨裝置合併。";
function freshStore() {
  return { app: "Simon Life", schema: 1, _about: ABOUT,
    settings: Object.assign(clone(DEFAULT_SETTINGS), { updatedAt: 0 }),
    roadmap: Object.assign(clone(DEFAULT_ROADMAP), { updatedAt: 0 }),
    days: {}, notes: {}, reviews: {} };
}
function normalize(s) {
  const f = freshStore();
  if (!s || typeof s !== "object") return f;
  const st = s.settings && typeof s.settings === "object" ? s.settings : f.settings;
  st.schedule = Object.assign(clone(DEFAULT_SETTINGS.schedule), st.schedule || {});
  st.habits = Array.isArray(st.habits) ? st.habits : clone(DEFAULT_SETTINGS.habits);
  st.topics = Array.isArray(st.topics) && st.topics.length ? st.topics : clone(DEFAULT_SETTINGS.topics);
  st.enlist = st.enlist || clone(DEFAULT_SETTINGS.enlist);
  const rm = s.roadmap && Array.isArray(s.roadmap.weeks) ? s.roadmap : f.roadmap;
  return { app: "Simon Life", schema: 1, _about: ABOUT, settings: st, roadmap: rm,
    days: s.days && typeof s.days === "object" ? s.days : {},
    notes: s.notes && typeof s.notes === "object" ? s.notes : {},
    reviews: s.reviews && typeof s.reviews === "object" ? s.reviews : {} };
}
let store = normalize(lsGet(LS.data));
let meta = Object.assign({ fileId: null, lastSync: 0, dirty: false, email: "", name: "", linked: false, lastSilent: 0, syncError: "" }, lsGet(LS.meta) || {});
let auth = Object.assign({ token: null, exp: 0 }, lsGet(LS.auth) || {});
let editSeq = 0;
const saveMeta = () => lsSet(LS.meta, meta);
const touch = rec => { rec.updatedAt = Date.now(); };
function commit() { editSeq++; meta.dirty = true; if (!lsSet(LS.data, store)) toast("這台裝置的儲存空間不足，請先同步或匯出備份"); saveMeta(); scheduleSync(); renderHeader(); }

/* ---------- merge ---------- */
const newer = (a, b) => { if (!a) return b; if (!b) return a; return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a; };
function mergeMap(a, b) { const out = {}; const keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {}))); keys.forEach(k => { out[k] = newer((a || {})[k], (b || {})[k]); }); return out; }
function merge(local, remote) {
  remote = normalize(remote);
  return normalize({ settings: newer(local.settings, remote.settings), roadmap: newer(local.roadmap, remote.roadmap),
    days: mergeMap(local.days, remote.days), notes: mergeMap(local.notes, remote.notes), reviews: mergeMap(local.reviews, remote.reviews) });
}

/* ---------- Google auth (OAuth 2.0 client-side redirect flow) ---------- */
const CFG = window.SIMON_CONFIG || {};
const CLIENT_ID = String(CFG.clientId || "").trim();
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FILE_NAME = "simon-life-data.json";
const tokenValid = () => !!(auth.token && Date.now() < auth.exp);
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, "");
function signIn(silent) {
  if (!CLIENT_ID) { toast("尚未設定 Google 用戶端 ID"); return; }
  if (!navigator.onLine) { toast("目前沒有網路，連上網路後再試"); return; }
  const st = uid();
  try { localStorage.setItem(LS.state, st); localStorage.setItem(LS.ret, S.view); } catch (_) { }
  if (silent) { meta.lastSilent = Date.now(); saveMeta(); }
  const p = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirectUri(), response_type: "token", scope: SCOPE, include_granted_scopes: "true", state: st + (silent ? ".s" : "") });
  if (silent) p.set("prompt", "none");
  if (meta.email) p.set("login_hint", meta.email);
  location.assign("https://accounts.google.com/o/oauth2/v2/auth?" + p.toString());
}
function handleRedirect() {
  const h = location.hash || "";
  if (h.indexOf("access_token=") < 0 && h.indexOf("error=") < 0) return null;
  const q = new URLSearchParams(h.slice(1));
  let expected = null; try { expected = localStorage.getItem(LS.state); localStorage.removeItem(LS.state); } catch (_) { }
  let ret = null; try { ret = localStorage.getItem(LS.ret); } catch (_) { }
  try { history.replaceState(null, "", location.pathname + location.search + (ret && VIEWS.includes(ret) ? "#" + ret : "")); } catch (_) { location.hash = ""; }
  if (ret && VIEWS.includes(ret)) S.view = ret;
  const st = (q.get("state") || "").split(".");
  if (!expected || st[0] !== expected) return "badstate";
  const silent = st[1] === "s";
  if (q.get("access_token")) {
    auth = { token: q.get("access_token"), exp: Date.now() + (Number(q.get("expires_in")) || 3600) * 1000 - 60000 };
    lsSet(LS.auth, auth); meta.linked = true; meta.syncError = ""; saveMeta();
    return "ok";
  }
  meta.syncError = silent ? "needauth" : (q.get("error") === "access_denied" ? "denied" : "autherror");
  saveMeta();
  return "error";
}
function signOut() {
  auth = { token: null, exp: 0 }; lsSet(LS.auth, auth);
  meta.linked = false; meta.email = ""; meta.name = ""; meta.fileId = null; meta.syncError = ""; saveMeta();
  setSync(); render(); toast("已登出，資料仍保留在這台裝置");
}

/* ---------- Drive API ---------- */
async function gfetch(url, opt) {
  opt = opt || {};
  if (!tokenValid()) throw { status: 401 };
  const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + auth.token }, opt.headers || {}) }));
  if (r.status === 401) { auth = { token: null, exp: 0 }; lsSet(LS.auth, auth); throw { status: 401 }; }
  if (!r.ok) { let t = ""; try { t = await r.text(); } catch (_) { } throw { status: r.status, text: t }; }
  return r;
}
async function findFile() {
  const q = encodeURIComponent("name='" + FILE_NAME + "' and trashed=false");
  const r = await gfetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&spaces=drive&orderBy=createdTime&pageSize=10&fields=files(id,createdTime)");
  const j = await r.json();
  return j.files && j.files.length ? j.files[0].id : null;
}
async function download(id) { const r = await gfetch("https://www.googleapis.com/drive/v3/files/" + id + "?alt=media"); return r.json(); }
async function createFile(content) {
  const b = "simonlife" + uid();
  const body = "--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify({ name: FILE_NAME, mimeType: "application/json", description: "Simon Life app 的資料檔（請勿手動改名）" }) +
    "\r\n--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + content + "\r\n--" + b + "--";
  const r = await gfetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + b }, body });
  return (await r.json()).id;
}
async function updateFile(id, content) {
  await gfetch("https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media", { method: "PATCH", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: content });
}
async function loadProfile() {
  try { const r = await gfetch("https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)"); const j = await r.json(); if (j.user) { meta.email = j.user.emailAddress || ""; meta.name = j.user.displayName || ""; saveMeta(); } } catch (_) { }
}

/* ---------- sync ---------- */
let syncing = false, again = false, syncTimer = null, syncState = "";
function setSync(s) {
  if (s != null) syncState = s;
  const p = document.getElementById("statusPill"); if (!p) return;
  let txt = "本機模式", cls = "";
  if (!CLIENT_ID) { txt = meta.dirty ? "本機模式" : "本機模式"; }
  else if (syncState === "syncing") { txt = "同步中…"; }
  else if (!navigator.onLine) { txt = meta.dirty ? "離線 · 有變更待同步" : "離線"; cls = "warn"; }
  else if (!tokenValid() && meta.linked) { txt = "需要重新連結 Google"; cls = "warn"; }
  else if (!meta.linked) { txt = "未連結 Google"; cls = "warn"; }
  else if (syncState === "error") { txt = "同步失敗"; cls = "bad"; }
  else if (meta.dirty) { txt = "有變更待同步"; }
  else { txt = "已同步 " + fmtTime(meta.lastSync).split(" ")[1]; cls = "ok"; }
  p.textContent = txt; p.className = "pill " + cls;
}
function scheduleSync(delay) { clearTimeout(syncTimer); setSync(); if (!tokenValid()) return; syncTimer = setTimeout(sync, delay == null ? 1500 : delay); }
async function sync() {
  if (!CLIENT_ID || !tokenValid() || !navigator.onLine) { setSync(); return; }
  if (syncing) { again = true; return; }
  syncing = true; setSync("syncing");
  const seq = editSeq;
  try {
    let id = meta.fileId || await findFile();
    let remote = null;
    if (id) { try { remote = await download(id); } catch (e) { if (e.status === 404) { id = await findFile(); remote = id ? await download(id) : null; } else throw e; } }
    const merged = remote ? merge(store, remote) : store;
    const mergedStr = JSON.stringify(merged);
    store = merged; lsSet(LS.data, store);
    if (!id) id = await createFile(mergedStr);
    else if (meta.dirty || !remote || mergedStr !== JSON.stringify(normalize(remote))) await updateFile(id, mergedStr);
    meta.fileId = id; meta.lastSync = Date.now(); meta.syncError = "";
    if (editSeq === seq) meta.dirty = false; else again = true;
    saveMeta(); syncState = "ok";
    if (!meta.email) loadProfile().then(() => { if (S.view === "settings") render(); });
    render();
  } catch (e) {
    if (e && e.status === 401) { meta.syncError = "needauth"; syncState = "needauth"; }
    else { meta.syncError = navigator.onLine ? "error" : "offline"; syncState = "error"; }
    saveMeta();
    if (S.view === "settings") render();
  } finally {
    syncing = false; setSync();
    if (again) { again = false; scheduleSync(500); }
  }
}

/* ---------- view state ---------- */
const S = {
  view: "today", date: ymd(today0()), schedTab: dayType(today0()), editSched: false, editHabits: false, editRm: false,
  noteKind: "insight", noteFilter: "all", noteCat: "AI", confirmDel: null, composerOpen: false,
  week: ymd(mondayOf(today0())), installEvt: null, confirmSignOut: false
};
const getDay = d => store.days[d] || { date: d, habits: {}, wake: "", sleep: "", tasks: [], ex: { type: "", min: "", km: "", push: "" }, energy: 0, note: "" };
const ensureDay = d => { if (!store.days[d]) store.days[d] = getDay(d); const x = store.days[d]; x.date = d; x.habits = x.habits || {}; x.tasks = x.tasks || []; x.ex = x.ex || {}; return x; };
const notesList = () => Object.values(store.notes).filter(n => n && !n.deleted).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
const changeDay = d => { touch(store.days[d]); commit(); };
const changeSettings = () => { touch(store.settings); commit(); };
const changeRoadmap = () => { touch(store.roadmap); commit(); };

/* ---------- render plumbing ---------- */
let renderQueued = false;
function render() {
  const ae = document.activeElement;
  if (ae && ae.id && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") && document.getElementById("view").contains(ae) && ae.type !== "file") { renderQueued = true; renderHeader(); return; }
  const fid = ae && ae.id;
  document.querySelectorAll("#tabs .tab").forEach(b => b.setAttribute("aria-current", b.dataset.v === S.view ? "page" : "false"));
  const v = document.getElementById("view");
  v.innerHTML = ({ today: vToday, schedule: vSchedule, learn: vLearn, notes: vNotes, review: vReview, settings: vSettings }[S.view] || vToday)();
  if (fid) { const f = document.getElementById(fid); if (f) f.focus({ preventScroll: true }); }
  renderHeader();
}
document.addEventListener("focusout", () => { setTimeout(() => { if (renderQueued) { const ae = document.activeElement; if (!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))) { renderQueued = false; render(); } } }, 0); });
function renderHeader() {
  const p = document.getElementById("enlistPill"); const e = store.settings.enlist || {};
  if (e.date) { const n = Math.round((parseYmd(e.date) - today0()) / 864e5); p.textContent = n > 0 ? ("距入伍 " + n + " 天") : n === 0 ? "今天入伍" : "已入伍"; }
  else p.textContent = "入伍時間未定 · " + (e.note || "");
  setSync();
}
function syncBanner() {
  if (!CLIENT_ID || S.view === "settings") return "";
  if (!meta.linked) return `<div class="banner"><p>連結 Google 帳號後，資料會存到你的雲端硬碟，手機、平板、電腦都能同步。</p><button class="btn primary" data-act="signin">連結 Google</button></div>`;
  if (!tokenValid() && navigator.onLine) return `<div class="banner"><p>Google 連線已過期，你的變更會先存在這台裝置。</p><button class="btn primary" data-act="signin">重新連結</button></div>`;
  return "";
}

/* ---------- views: today ---------- */
function blocksFor(type) { return (store.settings.schedule[type] || []).slice().sort((a, b) => (toMin(a.start) ?? 0) - (toMin(b.start) ?? 0)); }
function nowInfo() {
  const n = new Date(); const t = n.getHours() * 60 + n.getMinutes(); const bl = blocksFor(dayType(n));
  let cur = null;
  bl.forEach((b, i) => { const s = toMin(b.start); const e = toMin(b.end) ?? (bl[i + 1] ? toMin(bl[i + 1].start) : 1440); if (s != null && s <= t && t < e) cur = b; });
  const next = bl.find(b => (toMin(b.start) ?? -1) > t) || null;
  return { t, cur, next, clock: pad(n.getHours()) + ":" + pad(n.getMinutes()) };
}
function vToday() {
  const d = parseYmd(S.date), isToday = S.date === ymd(today0()), type = dayType(d), day = getDay(S.date);
  const hs = store.settings.habits.filter(h => (h.days || []).includes(type));
  const done = hs.filter(h => day.habits && day.habits[h.id]).length;
  const ni = nowInfo();
  const now = isToday ? `<section class="now" aria-live="polite"><div><div class="eyebrow">現在 · ${DT[type]}</div>
      <div class="lbl">${ni.cur ? esc(ni.cur.label) : "空檔時間"}</div>
      <div class="tm">${ni.cur ? esc(ni.cur.start) + (ni.cur.end ? "–" + esc(ni.cur.end) : "") : ""}</div>
      <div class="nx">${ni.next ? "接下來 " + esc(ni.next.start) + " · " + esc(ni.next.label) : "今天的行程到這裡，準備休息"}</div></div>
      <div class="clock" id="clock">${ni.clock}</div></section>` : "";
  const tasks = day.tasks || [], ex = day.ex || {};
  return `${syncBanner()}
  <div class="datebar"><button class="btn icon" data-act="day-prev" aria-label="前一天">‹</button>
    <span class="d">${md(d)}（${WD[d.getDay()]}）</span><span class="pill">${DT[type]}</span>
    <button class="btn icon" data-act="day-next" aria-label="後一天">›</button>
    ${isToday ? "" : '<button class="btn small" data-act="day-today">回到今天</button>'}</div>
  ${now}
  <div class="grid2">
    <section class="card"><h2>習慣打勾 <span class="count">${done}/${hs.length}</span></h2>
      <div class="meter" aria-hidden="true"><i style="width:${hs.length ? Math.round(done / hs.length * 100) : 0}%"></i></div>
      <div class="checks">${hs.map(h => `<button class="check" id="h-${esc(h.id)}" data-act="habit" data-id="${esc(h.id)}" aria-pressed="${!!(day.habits && day.habits[h.id])}"><span class="box">${CHECK}</span><span class="txt">${esc(h.label)}</span></button>`).join("") || '<p class="sub">這天沒有排定的習慣。</p>'}</div>
    </section>
    <section class="card"><h2>今天的 1–3 件事 <span class="count">${tasks.filter(t => t.done).length}/${tasks.length}</span></h2>
      <div class="tasks">${tasks.map(t => `<div class="task"><button class="check" id="t-${esc(t.id)}" data-act="task" data-id="${esc(t.id)}" aria-pressed="${!!t.done}"><span class="box">${CHECK}</span><span class="txt">${esc(t.text)}</span></button><button class="btn small danger" data-act="task-del" data-id="${esc(t.id)}">刪除</button></div>`).join("")}</div>
      ${tasks.length < 3 ? `<form class="row" data-form="task" style="margin-top:10px"><input id="newTask" placeholder="例如：讀完微影製程第 2 章" maxlength="80" enterkeyhint="done"><button class="btn primary" type="submit">加入</button></form>` : '<p class="sub" style="margin:10px 0 0">三件就夠了，完成後再加。</p>'}
      ${tasks.length === 0 ? '<p class="sub" style="margin:8px 0 0">具體寫到「完成什麼」，不要只寫「讀書」。</p>' : ""}
    </section>
  </div>
  <div class="grid2">
    <section class="card"><h2>作息紀錄</h2>
      <div class="fgrid">
        <label class="f">今天起床<input type="time" id="f-wake" data-day="wake" value="${esc(day.wake)}"></label>
        <label class="f">昨晚幾點睡<input type="time" id="f-sleep" data-day="sleep" value="${esc(day.sleep)}"></label>
      </div>
      <div style="margin-top:12px"><div class="sub" style="margin-bottom:6px">精神與專注（1 很差 · 5 很好）</div>
        <div class="dots">${[1, 2, 3, 4, 5].map(n => `<button id="en-${n}" data-act="energy" data-v="${n}" aria-pressed="${day.energy === n}">${n}</button>`).join("")}</div></div>
    </section>
    <section class="card"><h2>運動紀錄</h2>
      <div class="fgrid">
        <label class="f">項目<select id="f-ex-type" data-day="ex.type">${["", "投籃", "跑步", "肌力", "跑步＋肌力", "其他"].map(o => `<option value="${o}"${ex.type === o ? " selected" : ""}>${o || "未運動"}</option>`).join("")}</select></label>
        <label class="f">分鐘<input type="number" min="0" inputmode="numeric" id="f-ex-min" data-day="ex.min" value="${esc(ex.min)}"></label>
        <label class="f">跑步 km<input type="number" min="0" step="0.1" inputmode="decimal" id="f-ex-km" data-day="ex.km" value="${esc(ex.km)}"></label>
        <label class="f">伏地挺身<input type="number" min="0" inputmode="numeric" id="f-ex-push" data-day="ex.push" value="${esc(ex.push)}"></label>
      </div>
    </section>
  </div>
  <section class="card"><h2>今天一句話</h2>
    <textarea id="f-note" data-day="note" placeholder="今天有什麼收穫、卡在哪裡，或只是心情。">${esc(day.note)}</textarea>
  </section>`;
}

/* ---------- views: schedule ---------- */
function vSchedule() {
  const type = S.schedTab, bl = blocksFor(type);
  const isTodayType = type === dayType(new Date()); const ni = nowInfo();
  const rows = bl.map(b => {
    if (S.editSched) return `<div class="tl edit">
      <input type="time" id="s-${b.id}-start" data-sched="start" data-id="${b.id}" value="${esc(b.start)}" aria-label="開始">
      <input type="time" id="s-${b.id}-end" data-sched="end" data-id="${b.id}" value="${esc(b.end)}" aria-label="結束">
      <input class="lab" id="s-${b.id}-label" data-sched="label" data-id="${b.id}" value="${esc(b.label)}" aria-label="內容">
      <select id="s-${b.id}-tag" data-sched="tag" data-id="${b.id}" aria-label="類別">${TAGS.map(t => `<option${b.tag === t ? " selected" : ""}>${t}</option>`).join("")}</select>
      <button class="btn small danger" data-act="sched-del" data-id="${b.id}">刪除</button></div>`;
    const cur = isTodayType && ni.cur && ni.cur.id === b.id;
    return `<div class="tl${cur ? " cur" : ""}"><span class="t">${esc(b.start)}${b.end ? "–" + esc(b.end) : ""}</span><span>${esc(b.label)}</span><span class="tag" data-tag="${esc(b.tag)}">${esc(b.tag)}</span></div>`;
  }).join("");
  const hs = store.settings.habits, e = store.settings.enlist || {};
  return `${syncBanner()}
  <section class="card"><h2>每日行程
      <span class="row"><span class="seg" role="group" aria-label="日別">${["mwf", "tt", "wkd"].map(k => `<button data-act="sched-tab" data-v="${k}" aria-pressed="${type === k}">${DT[k]}</button>`).join("")}</span>
      <button class="btn small" data-act="sched-edit">${S.editSched ? "完成編輯" : "編輯"}</button></span></h2>
    <div>${rows || '<p class="sub">還沒有行程。</p>'}</div>
    ${S.editSched ? `<div class="row" style="margin-top:10px"><button class="btn" data-act="sched-add">新增時段</button><span class="sub">變更會自動儲存，依開始時間排序。</span></div>` : ""}
  </section>
  <section class="card"><h2>習慣清單 <button class="btn small" data-act="habit-edit">${S.editHabits ? "完成編輯" : "編輯"}</button></h2>
    <p class="sub" style="margin-top:0">「今日」頁會依星期顯示對應的習慣。</p>
    <div class="checks">${hs.map(h => S.editHabits ? `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">
        <input id="hl-${esc(h.id)}" data-habit-label="${esc(h.id)}" value="${esc(h.label)}" style="flex:1 1 200px" aria-label="習慣名稱">
        <span class="seg">${["mwf", "tt", "wkd"].map(k => `<button data-act="habit-day" data-id="${esc(h.id)}" data-v="${k}" aria-pressed="${(h.days || []).includes(k)}">${DT[k]}</button>`).join("")}</span>
        <button class="btn small danger" data-act="habit-del" data-id="${esc(h.id)}">刪除</button></div>`
      : `<div class="tl" style="grid-template-columns:1fr auto"><span>${esc(h.label)}</span><span class="sub">${(h.days || []).map(k => DT[k]).join("、")}</span></div>`).join("")}</div>
    ${S.editHabits ? '<button class="btn" data-act="habit-add" style="margin-top:10px">新增習慣</button>' : ""}
  </section>
  <section class="card"><h2>入伍日期</h2>
    <div class="fgrid">
      <label class="f">確定日期（未定可留空）<input type="date" id="enlistDate" data-enlist="date" value="${esc(e.date)}"></label>
      <label class="f">備註<input id="enlistNote" data-enlist="note" value="${esc(e.note)}"></label>
    </div>
  </section>`;
}

/* ---------- views: learn ---------- */
function vLearn() {
  const rm = store.roadmap, start = parseYmd(rm.start || ymd(mondayOf(today0()))), t = today0();
  const all = rm.weeks.flatMap(w => w.items), dn = all.filter(i => i.done).length;
  return `${syncBanner()}
  <section class="card"><h2>入伍前學習路線 <span class="count">${dn}/${all.length} 完成</span></h2>
    <div class="meter" aria-hidden="true"><i style="width:${all.length ? Math.round(dn / all.length * 100) : 0}%"></i></div>
    <div class="row" style="margin-top:12px">
      <span class="track main">主線</span><span class="sub">半導體製程</span>
      <span class="track side">副線</span><span class="sub">設備品質、作品集</span>
      <span class="track int">興趣</span><span class="sub">本週研究主題</span>
      <span class="spacer"></span>
      <button class="btn small" data-act="rm-edit">${S.editRm ? "完成編輯" : "編輯路線"}</button>
    </div>
    ${S.editRm ? `<label class="f" style="margin-top:10px;max-width:220px">第 1 週開始日<input type="date" id="rmStart" data-rm-start="1" value="${esc(rm.start)}"></label>` : ""}
  </section>
  ${rm.weeks.map((w, wi) => {
    const ws = addDays(start, wi * 7), we = addDays(ws, 6), cur = t >= ws && t <= we, d = w.items.filter(i => i.done).length;
    return `<section class="card week${cur ? " wk-cur" : ""}"><h3>第 ${wi + 1} 週 <span class="rng">${md(ws)}–${md(we)}</span>${cur ? '<span class="pill copper">本週</span>' : ""}<span class="spacer"></span><span class="count">${d}/${w.items.length}</span>
      ${S.editRm && rm.weeks.length > 1 ? `<button class="btn small danger" data-act="rm-delweek" data-w="${wi}">刪除此週</button>` : ""}</h3>
      <div class="checks">${w.items.map((it, ii) => `<div class="task"><button class="check" id="rm-${esc(it.id)}" data-act="rm-toggle" data-w="${wi}" data-i="${ii}" aria-pressed="${!!it.done}"><span class="box">${CHECK}</span><span class="track ${esc(it.track)}">${TRACK[it.track] || "其他"}</span><span class="txt">${esc(it.text)}</span></button>${S.editRm ? `<button class="btn small danger" data-act="rm-del" data-w="${wi}" data-i="${ii}">刪除</button>` : ""}</div>`).join("")}</div>
      ${S.editRm ? `<form class="row" data-form="rm" data-w="${wi}"><select id="rmTrack-${wi}" style="flex:0 0 96px" aria-label="類別">${Object.entries(TRACK).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><input id="rmNew-${wi}" placeholder="新增項目" style="flex:1 1 180px"><button class="btn" type="submit">加入</button></form>` : ""}
    </section>`; }).join("")}
  ${S.editRm ? '<button class="btn" data-act="rm-addweek">新增一週</button>' : ""}`;
}

/* ---------- views: notes ---------- */
function vNotes() {
  const topics = store.settings.topics, t = ymd(today0()), notes = notesList();
  const isDue = n => n.kind === "market" && n.reviewDate && n.reviewDate <= t && !n.reviewed;
  let list = notes;
  if (S.noteFilter === "due") list = list.filter(isDue); else if (S.noteFilter !== "all") list = list.filter(n => n.cat === S.noteFilter);
  const dueN = notes.filter(isDue).length;
  const comp = S.composerOpen ? `
    <div style="display:grid;gap:10px">
      <span class="seg" role="group" aria-label="筆記類型"><button data-act="note-kind" data-v="insight" aria-pressed="${S.noteKind === "insight"}">觀點筆記</button><button data-act="note-kind" data-v="market" aria-pressed="${S.noteKind === "market"}">市場觀察</button></span>
      <div class="chips" role="group" aria-label="主題">${topics.map(c => `<button class="chip" data-act="note-cat" data-v="${esc(c)}" aria-pressed="${S.noteCat === c}">${esc(c)}</button>`).join("")}</div>
      <input id="nTitle" placeholder="標題，例如：美國對 AI 晶片出口管制新規" maxlength="120">
      <textarea id="nBody" rows="5" placeholder="發生了什麼（2–3 句）&#10;我的觀點：這會影響什麼？我怎麼看？"></textarea>
      ${S.noteKind === "market" ? `<div class="fgrid"><label class="f">我的判斷<input id="nCall" placeholder="例如：未來一個月半導體股偏弱"></label><label class="f">何時回來檢視<input type="date" id="nDate" value="${ymd(addDays(today0(), 28))}"></label></div>` : ""}
      <div class="row"><button class="btn primary" data-act="note-save">儲存筆記</button><button class="btn" data-act="note-close">取消</button></div>
    </div>` : `<div class="row"><button class="btn primary" data-act="note-open">新增筆記</button><span class="sub">研究完寫 3–5 句「我的觀點」，比摘要更能留下東西。</span></div>`;
  return `${syncBanner()}
  <section class="card"><h2>寫下觀察</h2>${comp}</section>
  <div class="chips" role="group" aria-label="篩選">
    <button class="chip" data-act="note-filter" data-v="all" aria-pressed="${S.noteFilter === "all"}">全部 ${notes.length}</button>
    ${topics.map(c => `<button class="chip" data-act="note-filter" data-v="${esc(c)}" aria-pressed="${S.noteFilter === c}">${esc(c)}</button>`).join("")}
    <button class="chip" data-act="note-filter" data-v="due" aria-pressed="${S.noteFilter === "due"}">待檢視 ${dueN}</button>
  </div>
  ${list.length ? list.map(n => { const due = isDue(n);
    return `<article class="card note"><div class="hd"><span class="cat">${esc(n.cat)}</span><span class="kind">${n.kind === "market" ? "市場觀察" : "觀點筆記"} · ${esc(n.date || "")}</span>${due ? '<span class="tag due">該回來檢視了</span>' : ""}${n.reviewed ? '<span class="tag" data-tag="運動">已檢視</span>' : ""}<span class="spacer"></span>
      <button class="btn small danger" data-act="note-del" data-id="${esc(n.id)}">${S.confirmDel === n.id ? "再按一次刪除" : "刪除"}</button></div>
      <h3>${esc(n.title || "（無標題）")}</h3>
      ${n.body ? `<div class="body">${esc(n.body)}</div>` : ""}
      ${n.kind === "market" ? `<div class="call"><b>判斷</b>：${esc(n.call || "—")}<br><span class="sub">檢視日 ${esc(n.reviewDate || "未設")}</span>${n.outcome ? `<br><b>結果</b>：${esc(n.outcome)}` : ""}</div>` : ""}
      ${due ? `<div class="row"><input id="out-${esc(n.id)}" placeholder="實際結果如何？判斷對在哪、錯在哪？" style="flex:1 1 220px"><button class="btn" data-act="note-review" data-id="${esc(n.id)}">記錄結果</button></div>` : ""}
    </article>`; }).join("") : `<div class="empty">${notes.length ? "這個分類還沒有筆記。" : "還沒有筆記。看完一則新聞或影片後，按「新增筆記」寫下你的觀點。"}</div>`}`;
}

/* ---------- views: review ---------- */
function weekDays() { const m = parseYmd(S.week); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); }
function dayScore(dstr) { const d = parseYmd(dstr), day = store.days[dstr]; const hs = store.settings.habits.filter(h => (h.days || []).includes(dayType(d))); if (!day || !hs.length) return null; return hs.filter(h => day.habits && day.habits[h.id]).length / hs.length; }
const sleepVal = t => { const m = toMin(t); if (m == null) return null; return m < 12 * 60 ? m + 1440 : m; };
function chart(pts, lo, hi, target, ticks, unit) {
  const W = 560, H = 150, L = 46, R = 12, T = 10, Bm = 24, pw = W - L - R, ph = H - T - Bm, n = pts.length;
  const x = i => L + (n < 2 ? pw / 2 : i * pw / (n - 1)), y = v => T + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * ph;
  let g = ticks.map(tk => `<line x1="${L}" x2="${W - R}" y1="${y(tk)}" y2="${y(tk)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 8}" y="${y(tk) + 4}" text-anchor="end" font-size="11" font-family="var(--f-mono)" fill="var(--muted)">${fmtMin(tk)}</text>`).join("");
  g += `<line x1="${L}" x2="${W - R}" y1="${y(target)}" y2="${y(target)}" stroke="var(--copper)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${W - R}" y="${y(target) - 5}" text-anchor="end" font-size="11" fill="var(--copper)">目標 ${fmtMin(target)}</text>`;
  let path = "", segs = []; pts.forEach((p, i) => { if (p.v == null) { if (path) segs.push(path); path = ""; } else path += (path ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1); }); if (path) segs.push(path);
  g += segs.map(s => `<path d="${s}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`).join("");
  g += pts.map((p, i) => p.v == null ? "" : `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === n - 1 ? 4 : 3}" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"><title>${p.label} ${fmtMin(p.v)}</title></circle>`).join("");
  g += pts.map((p, i) => i % 2 === (n - 1) % 2 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" font-family="var(--f-mono)" fill="var(--muted)">${p.label}</text>` : "").join("");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit}趨勢">${g}</svg></div>`;
}
function weekSummary() {
  return weekDays().map(d => { const k = ymd(d), day = store.days[k]; const hs = store.settings.habits.filter(h => (h.days || []).includes(dayType(d)));
    return { date: k, weekday: WD[d.getDay()], type: DT[dayType(d)], logged: !!day,
      habits_done: day ? hs.filter(h => day.habits && day.habits[h.id]).map(h => h.label) : [],
      habits_missed: day ? hs.filter(h => !(day.habits && day.habits[h.id])).map(h => h.label) : hs.map(h => h.label),
      wake: day && day.wake || null, slept_last_night: day && day.sleep || null, exercise: day && day.ex && day.ex.type ? day.ex : null,
      energy: day && day.energy || null, tasks: day ? (day.tasks || []).map(t => (t.done ? "[完成] " : "[未完成] ") + t.text) : [], note: day && day.note || "" }; });
}
function vReview() {
  const wd = weekDays(), wk = isoWeek(wd[0]), rv = store.reviews[wk] || {}, keys = wd.map(ymd);
  const wakes = keys.map(k => store.days[k] && toMin(store.days[k].wake)).filter(v => v != null);
  const sleeps = keys.map(k => store.days[k] && sleepVal(store.days[k].sleep)).filter(v => v != null);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const exN = keys.filter(k => store.days[k] && store.days[k].ex && store.days[k].ex.type).length;
  const sc = keys.map(dayScore).filter(v => v != null);
  const t = today0(), last14 = [...Array(14)].map((_, i) => addDays(t, i - 13));
  const lvl = v => v == null || v === 0 ? 0 : v < .34 ? 1 : v < .67 ? 2 : v < 1 ? 3 : 4;
  const wkCur = S.week === ymd(mondayOf(t));
  const pts = f => last14.map(d => ({ label: md(d), v: f(store.days[ymd(d)]) }));
  return `${syncBanner()}
  <div class="datebar"><button class="btn icon" data-act="wk-prev" aria-label="上一週">‹</button><span class="d">${wk.replace("-W", " 第 ")} 週</span><span class="pill">${md(wd[0])}–${md(wd[6])}</span><button class="btn icon" data-act="wk-next" aria-label="下一週">›</button>${wkCur ? "" : '<button class="btn small" data-act="wk-cur">回到本週</button>'}</div>
  <div class="stats">
    <div class="stat"><div class="v">${wakes.length ? fmtMin(avg(wakes)) : "—"}</div><div class="k">平均起床（${wakes.length} 天）</div></div>
    <div class="stat"><div class="v">${sleeps.length ? fmtMin(avg(sleeps)) : "—"}</div><div class="k">平均入睡（${sleeps.length} 天）</div></div>
    <div class="stat"><div class="v">${exN}<span class="count"> / 7</span></div><div class="k">運動天數</div></div>
    <div class="stat"><div class="v">${sc.length ? Math.round(avg(sc) * 100) + "%" : "—"}</div><div class="k">習慣完成率</div></div>
  </div>
  <section class="card"><h2>近 14 天習慣完成度 <span class="sub" style="font-weight:400">顏色越深完成越多</span></h2>
    <div class="strip">${last14.map(d => { const v = dayScore(ymd(d)); return `<div class="cell${ymd(d) === ymd(t) ? " today" : ""}" data-l="${lvl(v)}" title="${md(d)} ${v == null ? "未紀錄" : Math.round(v * 100) + "%"}"></div>`; }).join("")}</div>
    <div class="striplab" style="margin-top:4px">${last14.map(d => `<span>${WD[d.getDay()]}</span>`).join("")}</div>
  </section>
  <div class="grid2">
    <section class="card"><h2>起床時間 <span class="sub" style="font-weight:400">近 14 天</span></h2>${chart(pts(x => x ? toMin(x.wake) : null), 360, 720, 480, [360, 480, 600, 720], "起床")}</section>
    <section class="card"><h2>入睡時間 <span class="sub" style="font-weight:400">近 14 天</span></h2>${chart(pts(x => x ? sleepVal(x.sleep) : null), 1320, 1680, 1410, [1320, 1440, 1560, 1680], "入睡")}</section>
  </div>
  <section class="card"><h2>本週回顧</h2>
    <div style="display:grid;gap:10px">
      <label class="f">這週做得好的地方<textarea id="rv-good" data-rv="good" rows="2">${esc(rv.good)}</textarea></label>
      <label class="f">卡住或拖延的地方<textarea id="rv-stuck" data-rv="stuck" rows="2">${esc(rv.stuck)}</textarea></label>
      <label class="f">下週想調整的一件事<textarea id="rv-next" data-rv="next" rows="2">${esc(rv.next)}</textarea></label>
    </div>
  </section>
  <section class="card"><h2>交給 Claude 分析</h2>
    <p class="sub" style="margin-top:0">同步到 Google 後，可以直接在 Claude 對話裡說「讀取我的 Simon Life 資料，幫我做這週回顧」。也可以複製本週資料，貼到任何 Claude 對話。</p>
    <div class="row"><button class="btn primary" data-act="copy-week">複製本週資料</button></div>
    ${rv.ai ? `<div class="ai" style="margin-top:12px">${esc(rv.ai)}</div>` : ""}
  </section>`;
}

/* ---------- views: settings ---------- */
function vSettings() {
  const online = navigator.onLine;
  let gcard;
  if (!CLIENT_ID) gcard = `<p>尚未設定 Google 用戶端 ID，目前資料只存在這台裝置。完成 Google Cloud 設定後就能跨裝置同步。</p>`;
  else if (!meta.linked) gcard = `<p>連結 Google 帳號後，資料會存成你雲端硬碟裡的「${FILE_NAME}」。手機、平板、電腦用同一個 Google 帳號登入，就會看到同一份資料。</p>
      <p class="sub">這個 app 只會要求「存取它自己建立的檔案」的權限，看不到你雲端硬碟裡的其他東西。</p>
      <button class="btn primary" data-act="signin">連結 Google 帳號</button>`;
  else gcard = `<dl class="kv">
        <dt>帳號</dt><dd>${esc(meta.email || "已連結")}${meta.name ? "（" + esc(meta.name) + "）" : ""}</dd>
        <dt>狀態</dt><dd>${!online ? "離線，連上網路後會自動同步" : tokenValid() ? (meta.dirty ? "有變更待同步" : "已同步") : "連線已過期，需要重新連結"}</dd>
        <dt>上次同步</dt><dd>${fmtTime(meta.lastSync)}</dd>
        <dt>雲端檔案</dt><dd>${FILE_NAME}</dd>
      </dl>
      ${meta.syncError === "error" ? '<p class="sub" style="color:var(--bad)">上次同步失敗，請稍後再按一次「立即同步」。</p>' : ""}
      ${meta.syncError === "denied" ? '<p class="sub" style="color:var(--bad)">你取消了 Google 授權，需要重新連結才能同步。</p>' : ""}
      <div class="row" style="margin-top:12px">
        ${tokenValid() ? '<button class="btn primary" data-act="sync-now">立即同步</button>' : '<button class="btn primary" data-act="signin">重新連結</button>'}
        <button class="btn danger" data-act="signout">${S.confirmSignOut ? "再按一次登出" : "登出"}</button>
      </div>`;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return `
  <section class="card"><h2>Google 同步</h2>${gcard}</section>
  <section class="card"><h2>安裝到主畫面</h2>
    ${standalone ? '<p>已經是安裝後的 app 模式。</p>' : `
    ${S.installEvt ? '<button class="btn primary" data-act="install">安裝 Simon Life</button>' : ""}
    <ol class="steps">${ios ? "<li>用 Safari 開啟這個網址</li><li>點下方的「分享」按鈕</li><li>選「加入主畫面」，再按「新增」</li>" : "<li>用 Chrome 開啟這個網址</li><li>點右上角「⋮」選單</li><li>選「安裝應用程式」或「加到主畫面」</li>"}</ol>
    <p class="sub">安裝後的 app 是獨立的，第一次打開需要再連結一次 Google 帳號。</p>`}
  </section>
  <section class="card"><h2>備份</h2>
    <p class="sub" style="margin-top:0">匯出一份完整資料（JSON），或從備份檔匯入。匯入會和現有資料合併，不會覆蓋較新的紀錄。</p>
    <div class="row"><button class="btn" data-act="export">匯出備份</button><label class="btn" for="importFile">匯入備份</label><input type="file" id="importFile" accept="application/json,.json" hidden></div>
  </section>
  <section class="card"><h2>關於</h2>
    <dl class="kv"><dt>版本</dt><dd>1.0（2026-11）</dd><dt>本機紀錄</dt><dd>${Object.keys(store.days).length} 天 · ${notesList().length} 則筆記</dd></dl>
  </section>`;
}

/* ---------- events ---------- */
function setPath(obj, path, val) { const p = path.split("."); let o = obj; for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; } o[p[p.length - 1]] = val; }
const findBlock = id => { for (const k of ["mwf", "tt", "wkd"]) { const b = (store.settings.schedule[k] || []).find(x => x.id === id); if (b) return b; } return null; };
function go(v) { S.view = v; try { history.replaceState(null, "", "#" + v); } catch (_) { location.hash = v; } window.scrollTo(0, 0); }
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, v = a.dataset.v, id = a.dataset.id;
  switch (act) {
    case "nav": go(v); break;
    case "day-prev": S.date = ymd(addDays(parseYmd(S.date), -1)); break;
    case "day-next": S.date = ymd(addDays(parseYmd(S.date), 1)); break;
    case "day-today": S.date = ymd(today0()); break;
    case "habit": { const d = ensureDay(S.date); d.habits[id] = !d.habits[id]; changeDay(S.date); break; }
    case "task": { const d = ensureDay(S.date); const t = d.tasks.find(x => x.id === id); if (t) t.done = !t.done; changeDay(S.date); break; }
    case "task-del": { const d = ensureDay(S.date); d.tasks = d.tasks.filter(x => x.id !== id); changeDay(S.date); break; }
    case "energy": { const d = ensureDay(S.date); const n = Number(v); d.energy = d.energy === n ? 0 : n; changeDay(S.date); break; }
    case "sched-tab": S.schedTab = v; break;
    case "sched-edit": S.editSched = !S.editSched; break;
    case "sched-add": { const k = S.schedTab; store.settings.schedule[k] = store.settings.schedule[k] || []; store.settings.schedule[k].push({ id: "b" + uid(), start: "", end: "", label: "新時段", tag: "生活" }); changeSettings(); break; }
    case "sched-del": { const k = S.schedTab; store.settings.schedule[k] = store.settings.schedule[k].filter(b => b.id !== id); changeSettings(); break; }
    case "habit-edit": S.editHabits = !S.editHabits; break;
    case "habit-add": store.settings.habits.push({ id: "h" + uid(), label: "新習慣", days: ["mwf", "tt"] }); changeSettings(); break;
    case "habit-del": store.settings.habits = store.settings.habits.filter(h => h.id !== id); changeSettings(); break;
    case "habit-day": { const h = store.settings.habits.find(x => x.id === id); if (h) { h.days = h.days || []; h.days = h.days.includes(v) ? h.days.filter(x => x !== v) : h.days.concat(v); changeSettings(); } break; }
    case "rm-edit": S.editRm = !S.editRm; break;
    case "rm-toggle": { const it = store.roadmap.weeks[+a.dataset.w].items[+a.dataset.i]; it.done = !it.done; changeRoadmap(); break; }
    case "rm-del": store.roadmap.weeks[+a.dataset.w].items.splice(+a.dataset.i, 1); changeRoadmap(); break;
    case "rm-delweek": store.roadmap.weeks.splice(+a.dataset.w, 1); changeRoadmap(); break;
    case "rm-addweek": store.roadmap.weeks.push({ id: "w" + uid(), items: [] }); changeRoadmap(); break;
    case "note-open": S.composerOpen = true; break;
    case "note-close": S.composerOpen = false; break;
    case "note-kind": S.noteKind = v; keepComposer(); break;
    case "note-cat": S.noteCat = v; keepComposer(); break;
    case "note-filter": S.noteFilter = v; break;
    case "note-save": saveNote(); return;
    case "note-del":
      if (S.confirmDel === id) { S.confirmDel = null; store.notes[id] = { id, deleted: true, updatedAt: Date.now() }; commit(); }
      else { S.confirmDel = id; setTimeout(() => { if (S.confirmDel === id) { S.confirmDel = null; render(); } }, 4000); }
      break;
    case "note-review": { const n = store.notes[id]; const inp = document.getElementById("out-" + id); if (n) { n.outcome = (inp && inp.value.trim()) || ""; n.reviewed = true; touch(n); commit(); } break; }
    case "wk-prev": S.week = ymd(addDays(parseYmd(S.week), -7)); break;
    case "wk-next": S.week = ymd(addDays(parseYmd(S.week), 7)); break;
    case "wk-cur": S.week = ymd(mondayOf(today0())); break;
    case "copy-week": copyWeek(); return;
    case "signin": signIn(false); return;
    case "sync-now": sync(); return;
    case "signout": if (S.confirmSignOut) { S.confirmSignOut = false; signOut(); return; } S.confirmSignOut = true; setTimeout(() => { if (S.confirmSignOut) { S.confirmSignOut = false; render(); } }, 4000); break;
    case "export": exportData(); return;
    case "install": if (S.installEvt) { S.installEvt.prompt(); S.installEvt.userChoice.finally(() => { S.installEvt = null; render(); }); } return;
    default: return;
  }
  render();
});
let draft = {};
function keepComposer() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
  draft = { title: g("nTitle") ?? draft.title, body: g("nBody") ?? draft.body, call: g("nCall") ?? draft.call, date: g("nDate") ?? draft.date };
  setTimeout(() => { [["nTitle", "title"], ["nBody", "body"], ["nCall", "call"], ["nDate", "date"]].forEach(([id, k]) => { const el = document.getElementById(id); if (el && draft[k]) el.value = draft[k]; }); }, 0);
}
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  if (f.dataset.form === "task") { const inp = document.getElementById("newTask"); const txt = inp.value.trim(); if (!txt) return; const d = ensureDay(S.date); if (d.tasks.length >= 3) return; d.tasks.push({ id: uid(), text: txt, done: false }); inp.value = ""; inp.blur(); changeDay(S.date); render(); }
  if (f.dataset.form === "rm") { const w = +f.dataset.w; const inp = document.getElementById("rmNew-" + w), tr = document.getElementById("rmTrack-" + w); const txt = inp.value.trim(); if (!txt) return; store.roadmap.weeks[w].items.push({ id: "i" + uid(), text: txt, track: tr.value, done: false }); changeRoadmap(); inp.value = ""; inp.blur(); render(); }
});
function onField(e, final) {
  const el = e.target;
  if (el.id === "importFile") { if (final) importData(el); return; }
  if (el.dataset.day) { const d = ensureDay(S.date); setPath(d, el.dataset.day, el.value); changeDay(S.date); }
  else if (el.dataset.sched) { const b = findBlock(el.dataset.id); if (b) { b[el.dataset.sched] = el.value; changeSettings(); if (final && el.dataset.sched !== "label") render(); } }
  else if (el.dataset.habitLabel) { const h = store.settings.habits.find(x => x.id === el.dataset.habitLabel); if (h) { h.label = el.value; changeSettings(); } }
  else if (el.dataset.enlist) { store.settings.enlist = store.settings.enlist || {}; store.settings.enlist[el.dataset.enlist] = el.value; changeSettings(); }
  else if (el.dataset.rmStart) { store.roadmap.start = el.value; changeRoadmap(); if (final) render(); }
  else if (el.dataset.rv) { const wk = isoWeek(parseYmd(S.week)); const r = store.reviews[wk] = Object.assign({ week: wk }, store.reviews[wk] || {}); r[el.dataset.rv] = el.value; touch(r); commit(); }
}
document.addEventListener("input", e => { if (e.target.tagName !== "SELECT" && e.target.type !== "file") onField(e, false); });
document.addEventListener("change", e => onField(e, true));

/* ---------- notes ---------- */
function saveNote() {
  const g = id => ((document.getElementById(id) || {}).value || "").trim();
  const title = g("nTitle"), body = g("nBody");
  if (!title && !body) { const t = document.getElementById("nTitle"); if (t) { t.placeholder = "先寫個標題或內容再儲存"; t.focus(); } return; }
  const n = { id: uid(), kind: S.noteKind, cat: S.noteCat, title, body, date: ymd(today0()), createdAt: new Date().toISOString() };
  if (S.noteKind === "market") { n.call = g("nCall"); n.reviewDate = g("nDate"); n.reviewed = false; n.outcome = ""; }
  touch(n); store.notes[n.id] = n; S.composerOpen = false; draft = {}; commit(); render(); toast("已儲存筆記");
}

/* ---------- copy / export / import ---------- */
function copyWeek() {
  const wk = isoWeek(parseYmd(S.week)), rv = store.reviews[wk] || {};
  const data = { week: wk, days: weekSummary(), reflection: { good: rv.good || "", stuck: rv.stuck || "", next: rv.next || "" } };
  const text = "請當我的生活教練，根據以下 Simon Life 一週紀錄（JSON，logged=false 代表那天沒有紀錄）與我的自我回顧，用繁體中文給我：【本週觀察】2–3 點（引用具體數據）、【最該調整的一件事】1 點、【下週建議】2–3 個具體可執行的小行動。\n\n" + JSON.stringify(data, null, 1);
  const fallback = () => { const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) { } ta.remove(); toast(ok ? "已複製，貼到 Claude 對話即可" : "無法自動複製，請改用匯出備份"); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast("已複製，貼到 Claude 對話即可"), fallback); else fallback();
}
function exportData() {
  const blob = new Blob([JSON.stringify(store, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "simon-life-backup-" + ymd(today0()) + ".json";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function importData(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const j = JSON.parse(r.result); if (!j || typeof j !== "object" || !j.days) throw 0; store = merge(store, j); commit(); render(); toast("已匯入並合併備份"); } catch (_) { toast("這不是 Simon Life 的備份檔"); } input.value = ""; };
  r.readAsText(f);
}

/* ---------- boot ---------- */
const redirectResult = handleRedirect();
const h0 = (location.hash || "").replace("#", ""); if (VIEWS.includes(h0)) S.view = h0;
window.addEventListener("hashchange", () => { const x = (location.hash || "").replace("#", ""); if (VIEWS.includes(x) && x !== S.view) { S.view = x; render(); } });
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installEvt = e; if (S.view === "settings") render(); });
window.addEventListener("online", () => { setSync(); if (tokenValid()) sync(); if (S.view === "settings") render(); });
window.addEventListener("offline", () => { setSync(); if (S.view === "settings") render(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { if (tokenValid()) sync(); render(); } });
setInterval(() => { if (document.visibilityState === "visible" && tokenValid() && meta.dirty) sync(); }, 60000);
setInterval(() => { const c = document.getElementById("clock"); if (!c) return; const ni = nowInfo(); if (c.textContent !== ni.clock) { c.textContent = ni.clock; if (/[05]$/.test(ni.clock)) render(); } }, 20000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js").catch(() => { });

render();
if (redirectResult === "ok") { toast("已連結 Google，正在同步"); loadProfile().then(() => render()); sync(); }
else if (redirectResult === "error" && meta.syncError === "denied") toast("你取消了 Google 授權");
else if (tokenValid()) sync();
else if (CLIENT_ID && meta.linked && navigator.onLine && redirectResult == null && Date.now() - (meta.lastSilent || 0) > 10 * 60 * 1000) signIn(true);
})();
