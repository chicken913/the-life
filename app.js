/* The Life v2 — 個人作息、專注、單字與筆記 PWA
 * 資料：本機 localStorage（離線可用）＋ Google 雲端硬碟 the-life-data.json（跨裝置同步）
 */
(function () {
"use strict";

/* ================= helpers ================= */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseYmd = s => { const p = String(s || "").split("-").map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const md = d => (d.getMonth() + 1) + "/" + pad(d.getDate());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const dayType = d => { const w = d.getDay(); return (w === 0 || w === 6) ? "wkd" : (w === 2 || w === 4) ? "tt" : "mwf"; };
const toMin = t => { if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null; const p = t.split(":").map(Number); return p[0] * 60 + p[1]; };
const fmtMin = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + "-W" + pad(w); }
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const daysBetween = (a, b) => Math.round((parseYmd(ymd(b)) - parseYmd(ymd(a))) / 864e5);
const fmtTime = ms => { if (!ms) return "—"; const d = new Date(ms); return md(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money = n => "NT$ " + Math.round(n).toLocaleString("en-US");
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="var(--surface)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600); }

/* ================= i18n ================= */
const T = {
zh: {
  tagline: "作息、專注與學習，一天一點累積", foot: "想加新功能，回到 Claude 對話描述需求即可迭代。",
  tab_today: "今日", tab_yesterday: "昨日", tab_focus: "專注", tab_vocab: "單字", tab_schedule: "作息", tab_learn: "學習路線", tab_notes: "趨勢筆記", tab_review: "週回顧", tab_settings: "設定",
  wd: ["日", "一", "二", "三", "四", "五", "六"], dt_mwf: "一三五", dt_tt: "二四", dt_wkd: "週末",
  prev_day: "前一天", next_day: "後一天", back_today: "回到今天", now: "現在", free_time: "空檔時間", next_up: "接下來", day_done: "今天的行程到這裡，準備休息",
  sec_quote: "每日佳句", sec_now: "現在", sec_habits: "習慣打勾", sec_tasks: "要做的事", sec_focus: "專注", sec_log: "作息紀錄", sec_exercise: "運動紀錄", sec_spend: "開銷", sec_note: "一句話日記",
  no_habits: "這天沒有排定的習慣。", streak: n => "連續 " + n + " 天", auto_focus: "完成專注自動打勾",
  task_ph: "例如：讀完微影製程第 2 章", add: "加入", del: "刪除", task_tip: "具體寫到「完成什麼」，不要只寫「讀書」。", task_max: "今天的事已經夠多了，先完成再加。",
  wake: "起床時間", slept: "昨晚幾點睡", energy: "精神與專注（1 很差 · 5 很好）",
  ex_type: "項目", ex_none: "未運動", ex_types: ["投籃", "跑步", "肌力", "跑步＋肌力", "其他"], ex_min: "分鐘", ex_km: "跑步 km", ex_push: "伏地挺身",
  sp_b: "早餐", sp_l: "午餐", sp_d: "晚餐", sp_o: "其他", sp_onote: "其他是什麼（交通、飲料…）", sp_total: "今日合計",
  note_ph: "今天有什麼收穫、卡在哪裡，或只是心情。",
  focus_today: m => "今天已專注 " + m + " 分鐘", focus_go: "開始專注", focus_running: "專注進行中",
  edit_layout: "編輯版面", done_edit: "完成", layout_tip: "用箭頭調整順序；「寬／窄」切換整行或半行；隱藏不需要的區塊。手機上會自動變成單欄。", move_up: "上移", move_down: "下移", wide: "整行", narrow: "半行", hide: "隱藏", show: "顯示", hidden_secs: "已隱藏：", reset_layout: "恢復預設",
  y_title: "昨天", y_habits: "習慣", y_tasks: "昨天的事", y_move: "移到今天", y_moved: "已移到今天", y_none_tasks: "昨天沒有記錄任務。", y_note: "昨天的日記", y_today: "今天要做的事", y_focus: "專注", y_spend: "開銷", y_ex: "運動", y_nodata: "昨天沒有任何紀錄。今天開始記錄，明天就能在這裡回顧。",
  f_title: "專注森林", f_pick: "選擇時間", f_tag: "這次要做什麼", f_start: "開始種樹", f_giveup: "放棄", f_giveup2: "再按一次放棄（樹會枯萎）", f_left: "剩下", f_growing: "專心，樹正在長大", f_rule: s => "離開 app 超過 " + s + " 秒，樹就會枯萎。專注時 app 會讓螢幕保持亮著。", f_rule_off: "寬鬆模式：離開 app 不會讓樹枯萎。",
  f_done: m => "完成！種下一棵 " + m + " 分鐘的樹", f_dead: "樹枯萎了，這次不算。下次離開前先暫停專注。", f_forest: "今天的森林", f_empty: "今天還沒有種樹。", f_week: "近 7 天專注分鐘", f_stats_today: "今日分鐘", f_stats_week: "本週分鐘", f_stats_trees: "累計樹木", f_stats_dead: "枯萎", f_custom: "自訂", f_minutes: "分鐘", f_live: "成功", f_withered: "枯萎",
  f_tags: { study: "學習", english: "英文", reading: "閱讀", piano: "鋼琴", work: "工作", other: "其他" },
  v_title: "每日單字", v_day: n => "第 " + n + " 天", v_mine: w => "用「" + w + "」造一個你自己的句子", v_known: "已學會", v_learned: n => "已學會 " + n + " 個", v_no_tts: "這台裝置不支援語音播放。", v_play: "播放", v_all: "全部播放", v_cycle: "單字庫已用完一輪，從頭複習。",
  sched_title: "每日行程", edit: "編輯", done: "完成編輯", add_block: "新增時段", sched_tip: "變更會自動儲存，依開始時間排序。", new_block: "新時段", start: "開始", end: "結束", content: "內容", category: "類別", no_blocks: "還沒有行程。",
  habits_title: "習慣清單", habits_tip: "核心習慣越少越容易持續，建議 5 個左右。", add_habit: "新增習慣", new_habit: "新習慣", habit_name: "習慣名稱",
  tags: { rest: "作息", study: "學習", interest: "興趣", move: "運動", life: "生活", fun: "娛樂" },
  rm_title: "學習路線", rm_done: n => n + " 完成", rm_main: "主線", rm_side: "副線", rm_int: "興趣", rm_main_d: "半導體製程", rm_side_d: "設備品質、作品集", rm_int_d: "本週研究主題", rm_edit: "編輯路線", rm_start: "第 1 週開始日", rm_week: n => "第 " + n + " 週", rm_this: "本週", rm_delweek: "刪除此週", rm_new: "新增項目", rm_addweek: "新增一週",
  n_title: "寫下觀察", n_insight: "觀點筆記", n_market: "市場觀察", n_title_ph: "標題，例如：美國對 AI 晶片出口管制新規", n_body_ph: "發生了什麼（2–3 句）\n我的觀點：這會影響什麼？我怎麼看？", n_call: "我的判斷", n_call_ph: "例如：未來一個月半導體股偏弱", n_when: "何時回來檢視", n_save: "儲存筆記", cancel: "取消", n_new: "新增筆記", n_tip: "研究完寫 3–5 句「我的觀點」，比摘要更能留下東西。", n_all: "全部", n_due: "待檢視", n_due_tag: "該回來檢視了", n_reviewed: "已檢視", n_del2: "再按一次刪除", n_untitled: "（無標題）", n_call_l: "判斷", n_review_day: "檢視日", n_unset: "未設", n_result: "結果", n_out_ph: "實際結果如何？判斷對在哪、錯在哪？", n_record: "記錄結果", n_empty_cat: "這個分類還沒有筆記。", n_empty: "還沒有筆記。看完一則新聞或影片後，按「新增筆記」寫下你的觀點。", n_saved: "已儲存筆記", n_need: "先寫個標題或內容再儲存",
  topics: { ai: "AI", chain: "區塊鏈", geo: "國際政治", macro: "總經市場", semi: "半導體", other: "其他" },
  r_week: (y, w) => y + " 第 " + w + " 週", r_prev: "上一週", r_next: "下一週", r_cur: "回到本週", r_wake: n => "平均起床（" + n + " 天）", r_sleep: n => "平均入睡（" + n + " 天）", r_focus: "專注分鐘", r_ex: "運動天數", r_habit: "習慣完成率", r_spend: "本週開銷", r_strip: "近 14 天習慣完成度", r_darker: "顏色越深完成越多", r_wake_c: "起床時間", r_sleep_c: "入睡時間", r_14: "近 14 天", r_target: "目標", r_spend_c: "本週開銷分布", r_reflect: "本週回顧", r_good: "這週做得好的地方", r_stuck: "卡住或拖延的地方", r_nextw: "下週想調整的一件事", r_claude: "交給 Claude 分析", r_claude_tip: "同步到 Google 後，可以直接在 Claude 對話裡說「讀取我的 The Life 資料，幫我做這週回顧」。也可以複製本週資料，貼到任何 Claude 對話。", r_copy: "複製本週資料", r_copied: "已複製，貼到 Claude 對話即可", r_copyfail: "無法自動複製，請改用匯出備份", r_avg_day: "日平均", r_unlogged: "未紀錄",
  s_lang: "語言", s_font: "字體大小", s_font_opts: ["小", "標準", "大", "特大"], s_google: "Google 同步", s_noid: "尚未設定 Google 用戶端 ID，目前資料只存在這台裝置。完成 Google Cloud 設定後就能跨裝置同步。", s_link_tip: f => "連結 Google 帳號後，資料會存成你雲端硬碟裡的「" + f + "」。手機、平板、電腦用同一個 Google 帳號登入，就會看到同一份資料。", s_scope_tip: "這個 app 只會要求「存取它自己建立的檔案」的權限，看不到你雲端硬碟裡的其他東西。", s_link: "連結 Google 帳號", s_relink: "重新連結", s_sync: "立即同步", s_signout: "登出", s_signout2: "再按一次登出", s_account: "帳號", s_status: "狀態", s_last: "上次同步", s_file: "雲端檔案", s_offline: "離線，連上網路後會自動同步", s_pending: "有變更待同步", s_synced: "已同步", s_expired: "連線已過期，需要重新連結", s_syncfail: "上次同步失敗，請稍後再按一次「立即同步」。", s_denied: "你取消了 Google 授權，需要重新連結才能同步。", s_linked: "已連結",
  s_notify: "早晚提醒", s_notify_tip: "時間到時，Google 日曆會在手機和電腦上通知你當天或隔天要做的事。需要先完成 Google 登入設定。", s_morning: "早上提醒（今天要做的事）", s_evening: "晚上提醒（明天要做的事）", s_notify_on: "啟用早晚提醒", s_notify_soon: "Google 登入設定完成後就會開始運作。",
  s_focus: "專注設定", s_goal: "每日專注目標（分鐘）", s_strict: "嚴格模式：離開 app 太久樹會枯萎", s_grace: "可離開的秒數",
  s_install: "安裝到主畫面", s_installed: "已經是安裝後的 app 模式。", s_install_btn: "安裝 The Life", s_ios: ["用 Safari 開啟這個網址", "點下方的「分享」按鈕", "選「加入主畫面」，再按「新增」"], s_android: ["用 Chrome 開啟這個網址", "點右上角「⋮」選單", "選「安裝並建立捷徑」或「安裝應用程式」"], s_install_tip: "安裝後第一次打開，需要再連結一次 Google 帳號。",
  s_backup: "備份", s_backup_tip: "匯出一份完整資料（JSON），或從備份檔匯入。匯入會和現有資料合併，不會覆蓋較新的紀錄。", s_export: "匯出備份", s_import: "匯入備份", s_imported: "已匯入並合併備份", s_badfile: "這不是 The Life 的備份檔", s_about: "關於", s_version: "版本", s_local: "本機紀錄", s_local_v: (d, n) => d + " 天 · " + n + " 則筆記",
  st_local: "本機模式", st_syncing: "同步中…", st_offline: "離線", st_offline_p: "離線 · 有變更待同步", st_relink: "需要重新連結 Google", st_unlinked: "未連結 Google", st_fail: "同步失敗", st_pending: "有變更待同步", st_ok: t => "已同步 " + t,
  b_link: "連結 Google 帳號後，資料會存到你的雲端硬碟，手機、平板、電腦都能同步。", b_link_btn: "連結 Google", b_expired: "Google 連線已過期，你的變更會先存在這台裝置。",
  t_noid: "尚未設定 Google 用戶端 ID", t_nonet: "目前沒有網路，連上網路後再試", t_linked: "已連結 Google，正在同步", t_denied: "你取消了 Google 授權", t_signedout: "已登出，資料仍保留在這台裝置", t_full: "這台裝置的儲存空間不足，請先同步或匯出備份", t_migrated: "已把 Simon Life 的資料搬到 The Life"
},
en: {
  tagline: "Routine, focus and learning, a little every day", foot: "Want a new feature? Describe it to Claude and the app can be updated.",
  tab_today: "Today", tab_yesterday: "Yesterday", tab_focus: "Focus", tab_vocab: "Words", tab_schedule: "Routine", tab_learn: "Roadmap", tab_notes: "Notes", tab_review: "Review", tab_settings: "Settings",
  wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], dt_mwf: "Mon·Wed·Fri", dt_tt: "Tue·Thu", dt_wkd: "Weekend",
  prev_day: "Previous day", next_day: "Next day", back_today: "Back to today", now: "Now", free_time: "Free time", next_up: "Next", day_done: "That's the day. Time to wind down.",
  sec_quote: "Quote of the day", sec_now: "Now", sec_habits: "Habits", sec_tasks: "To do", sec_focus: "Focus", sec_log: "Sleep log", sec_exercise: "Exercise", sec_spend: "Spending", sec_note: "One-line journal",
  no_habits: "No habits scheduled for this day.", streak: n => n + "-day streak", auto_focus: "Ticks itself when you finish focus",
  task_ph: "e.g. Finish chapter 2 on lithography", add: "Add", del: "Delete", task_tip: "Write what 'done' looks like, not just 'study'.", task_max: "That's enough for today. Finish these first.",
  wake: "Woke up at", slept: "Slept last night at", energy: "Energy and focus (1 low · 5 high)",
  ex_type: "Type", ex_none: "No exercise", ex_types: ["Basketball", "Running", "Strength", "Run + strength", "Other"], ex_min: "Minutes", ex_km: "Run km", ex_push: "Push-ups",
  sp_b: "Breakfast", sp_l: "Lunch", sp_d: "Dinner", sp_o: "Other", sp_onote: "What was 'other' (transport, drinks…)", sp_total: "Today's total",
  note_ph: "What did you learn, where did you get stuck, or how you feel.",
  focus_today: m => m + " focused minutes today", focus_go: "Start focus", focus_running: "Focus in progress",
  edit_layout: "Edit layout", done_edit: "Done", layout_tip: "Use the arrows to reorder; Wide/Half switches the width; hide what you don't need. Phones always show one column.", move_up: "Move up", move_down: "Move down", wide: "Wide", narrow: "Half", hide: "Hide", show: "Show", hidden_secs: "Hidden:", reset_layout: "Reset",
  y_title: "Yesterday", y_habits: "Habits", y_tasks: "Yesterday's tasks", y_move: "Move to today", y_moved: "Moved to today", y_none_tasks: "No tasks were logged yesterday.", y_note: "Yesterday's journal", y_today: "Today's tasks", y_focus: "Focus", y_spend: "Spending", y_ex: "Exercise", y_nodata: "Nothing was logged yesterday. Start today and you can look back here tomorrow.",
  f_title: "Focus forest", f_pick: "Pick a duration", f_tag: "What is this session for", f_start: "Plant a tree", f_giveup: "Give up", f_giveup2: "Tap again to give up (the tree withers)", f_left: "left", f_growing: "Stay with it, your tree is growing", f_rule: s => "Leave the app for more than " + s + " seconds and the tree withers. The screen stays on while you focus.", f_rule_off: "Relaxed mode: leaving the app won't kill the tree.",
  f_done: m => "Done! You planted a " + m + "-minute tree", f_dead: "The tree withered, so this one doesn't count.", f_forest: "Today's forest", f_empty: "No trees planted today yet.", f_week: "Focused minutes, last 7 days", f_stats_today: "Minutes today", f_stats_week: "Minutes this week", f_stats_trees: "Trees planted", f_stats_dead: "Withered", f_custom: "Custom", f_minutes: "min", f_live: "Grown", f_withered: "Withered",
  f_tags: { study: "Study", english: "English", reading: "Reading", piano: "Piano", work: "Work", other: "Other" },
  v_title: "Daily words", v_day: n => "Day " + n, v_mine: w => "Write your own sentence with “" + w + "”", v_known: "Learned", v_learned: n => n + " learned", v_no_tts: "Speech playback isn't supported on this device.", v_play: "Play", v_all: "Play all", v_cycle: "You've been through the whole list once. Reviewing from the start.",
  sched_title: "Daily routine", edit: "Edit", done: "Done", add_block: "Add a block", sched_tip: "Changes save automatically and sort by start time.", new_block: "New block", start: "Start", end: "End", content: "Activity", category: "Category", no_blocks: "No blocks yet.",
  habits_title: "Habits", habits_tip: "Fewer core habits are easier to keep. About five works well.", add_habit: "Add a habit", new_habit: "New habit", habit_name: "Habit name",
  tags: { rest: "Rest", study: "Study", interest: "Interest", move: "Exercise", life: "Life", fun: "Leisure" },
  rm_title: "Learning roadmap", rm_done: n => n + " done", rm_main: "Main", rm_side: "Side", rm_int: "Interest", rm_main_d: "Semiconductor process", rm_side_d: "Equipment, quality, portfolio", rm_int_d: "Topic of the week", rm_edit: "Edit roadmap", rm_start: "Week 1 starts on", rm_week: n => "Week " + n, rm_this: "This week", rm_delweek: "Delete week", rm_new: "New item", rm_addweek: "Add a week",
  n_title: "Write an observation", n_insight: "Insight", n_market: "Market call", n_title_ph: "Title, e.g. New US export rules on AI chips", n_body_ph: "What happened (2–3 sentences)\nMy view: what will this affect, and what do I think?", n_call: "My call", n_call_ph: "e.g. Chip stocks weak for the next month", n_when: "Review on", n_save: "Save note", cancel: "Cancel", n_new: "New note", n_tip: "Write 3–5 sentences of your own view. It sticks better than a summary.", n_all: "All", n_due: "Due", n_due_tag: "Time to review", n_reviewed: "Reviewed", n_del2: "Tap again to delete", n_untitled: "(Untitled)", n_call_l: "Call", n_review_day: "Review on", n_unset: "not set", n_result: "Outcome", n_out_ph: "What actually happened? Where was the call right or wrong?", n_record: "Save outcome", n_empty_cat: "No notes in this topic yet.", n_empty: "No notes yet. After a news story or video, tap New note and write your view.", n_saved: "Note saved", n_need: "Add a title or some text first",
  topics: { ai: "AI", chain: "Blockchain", geo: "Geopolitics", macro: "Macro & markets", semi: "Semiconductors", other: "Other" },
  r_week: (y, w) => y + " week " + w, r_prev: "Previous week", r_next: "Next week", r_cur: "This week", r_wake: n => "Avg wake-up (" + n + " days)", r_sleep: n => "Avg bedtime (" + n + " days)", r_focus: "Focused minutes", r_ex: "Exercise days", r_habit: "Habit rate", r_spend: "Spent this week", r_strip: "Habits, last 14 days", r_darker: "Darker means more done", r_wake_c: "Wake-up time", r_sleep_c: "Bedtime", r_14: "last 14 days", r_target: "Target", r_spend_c: "Spending this week", r_reflect: "Weekly reflection", r_good: "What went well", r_stuck: "Where I got stuck or procrastinated", r_nextw: "One thing to change next week", r_claude: "Ask Claude", r_claude_tip: "Once synced to Google, ask Claude: “Read my The Life data and review my week.” Or copy this week's data and paste it into any Claude chat.", r_copy: "Copy this week's data", r_copied: "Copied. Paste it into a Claude chat.", r_copyfail: "Couldn't copy automatically. Use Export backup instead.", r_avg_day: "per day", r_unlogged: "not logged",
  s_lang: "Language", s_font: "Text size", s_font_opts: ["Small", "Standard", "Large", "Extra large"], s_google: "Google sync", s_noid: "No Google client ID is set yet, so data stays on this device. Finish the Google Cloud setup to sync across devices.", s_link_tip: f => "Link your Google account and your data is saved as “" + f + "” in your Google Drive. Sign in with the same account on your phone, tablet and computer to see the same data.", s_scope_tip: "The app only asks to access files it creates itself. It can't see anything else in your Drive.", s_link: "Link Google account", s_relink: "Reconnect", s_sync: "Sync now", s_signout: "Sign out", s_signout2: "Tap again to sign out", s_account: "Account", s_status: "Status", s_last: "Last sync", s_file: "Drive file", s_offline: "Offline. It will sync when you're back online.", s_pending: "Changes waiting to sync", s_synced: "Synced", s_expired: "Connection expired. Reconnect to sync.", s_syncfail: "The last sync failed. Try Sync now again in a moment.", s_denied: "You cancelled Google access. Reconnect to sync.", s_linked: "Linked",
  s_notify: "Morning & evening reminders", s_notify_tip: "Google Calendar will notify your phone and computer about today's or tomorrow's tasks. Requires the Google sign-in setup.", s_morning: "Morning reminder (today's tasks)", s_evening: "Evening reminder (tomorrow's tasks)", s_notify_on: "Turn on reminders", s_notify_soon: "This starts working once Google sign-in is set up.",
  s_focus: "Focus settings", s_goal: "Daily focus goal (minutes)", s_strict: "Strict mode: the tree withers if you leave too long", s_grace: "Seconds you may leave",
  s_install: "Install on home screen", s_installed: "You're already using the installed app.", s_install_btn: "Install The Life", s_ios: ["Open this address in Safari", "Tap the Share button", "Choose Add to Home Screen, then Add"], s_android: ["Open this address in Chrome", "Tap the ⋮ menu", "Choose Install app"], s_install_tip: "The installed app needs you to link Google once more the first time.",
  s_backup: "Backup", s_backup_tip: "Export all your data as JSON, or import a backup. Importing merges with what's here and keeps the newer records.", s_export: "Export backup", s_import: "Import backup", s_imported: "Backup imported and merged", s_badfile: "That isn't a The Life backup file", s_about: "About", s_version: "Version", s_local: "On this device", s_local_v: (d, n) => d + " days · " + n + " notes",
  st_local: "Local mode", st_syncing: "Syncing…", st_offline: "Offline", st_offline_p: "Offline · changes pending", st_relink: "Reconnect Google", st_unlinked: "Google not linked", st_fail: "Sync failed", st_pending: "Changes pending", st_ok: t => "Synced " + t,
  b_link: "Link your Google account to save your data to Drive and sync across your phone, tablet and computer.", b_link_btn: "Link Google", b_expired: "The Google connection expired. Your changes are saved on this device for now.",
  t_noid: "No Google client ID is set yet", t_nonet: "You're offline. Try again when connected.", t_linked: "Google linked. Syncing now", t_denied: "You cancelled Google access", t_signedout: "Signed out. Your data is still on this device.", t_full: "This device is out of storage. Sync or export a backup first.", t_migrated: "Your Simon Life data has moved to The Life"
}};
let LANG = "zh";
const t = (k, ...a) => { const v = (T[LANG] && T[LANG][k] !== undefined) ? T[LANG][k] : T.zh[k]; return typeof v === "function" ? v(...a) : (v === undefined ? k : v); };
const L = o => o ? (o.label || (o.l && (o.l[LANG] || o.l.zh)) || o.text || "") : "";
const DT = k => t("dt_" + k);
const WD = i => t("wd")[i];

/* ================= defaults ================= */
let _n = 0;
const B = (s, e, zh, en, tag) => ({ id: "b" + (++_n), start: s, end: e, l: { zh, en }, tag });
const DEFAULT_SCHEDULE = {
  mwf: [B("08:00", "08:15", "起床、曬太陽", "Wake up, get sunlight", "rest"), B("08:15", "08:45", "晨間趨勢簡報", "Morning trend briefing", "interest"), B("09:00", "11:00", "半導體主線（專注）", "Semiconductor study (focus)", "study"), B("11:00", "12:00", "雜事", "Errands", "life"), B("12:00", "14:00", "午餐、短午睡", "Lunch, short nap", "life"), B("14:00", "15:30", "趨勢與市場深度研究", "Trends and markets deep dive", "interest"), B("16:30", "17:30", "練鋼琴", "Piano practice", "life"), B("18:00", "19:00", "晚餐", "Dinner", "life"), B("19:00", "20:00", "投籃＋前後拉伸", "Basketball + stretching", "move"), B("20:00", "20:30", "回家直接洗澡，手機不進浴室", "Shower first, no phone in the bathroom", "rest"), B("20:30", "22:30", "娛樂時間", "Free time", "fun"), B("23:00", "23:30", "手機下班，看書或聽音樂", "Phone off, read or listen to music", "rest"), B("23:30", "", "睡覺", "Sleep", "rest")],
  tt: [B("08:00", "08:15", "起床、曬太陽", "Wake up, get sunlight", "rest"), B("08:15", "08:45", "晨間趨勢簡報", "Morning trend briefing", "interest"), B("09:00", "11:00", "半導體主線（專注）", "Semiconductor study (focus)", "study"), B("11:00", "12:00", "雜事", "Errands", "life"), B("12:00", "14:00", "午餐、短午睡", "Lunch, short nap", "life"), B("14:00", "15:30", "半導體副線＋英文", "Side study + English", "study"), B("16:30", "17:30", "彈性時間", "Flexible time", "life"), B("18:00", "19:00", "晚餐", "Dinner", "life"), B("19:00", "20:00", "跑步＋徒手肌力", "Running + bodyweight strength", "move"), B("20:00", "20:30", "回家直接洗澡，手機不進浴室", "Shower first, no phone in the bathroom", "rest"), B("20:30", "22:30", "娛樂時間", "Free time", "fun"), B("23:00", "23:30", "手機下班，看書或聽音樂", "Phone off, read or listen to music", "rest"), B("23:30", "", "睡覺", "Sleep", "rest")],
  wkd: [B("09:00", "09:30", "起床、曬太陽", "Wake up, get sunlight", "rest"), B("10:00", "12:00", "自由時間", "Free time", "fun"), B("14:00", "17:00", "外出活動", "Go out (friends, hiking, cycling)", "life"), B("18:00", "19:00", "晚餐", "Dinner", "life"), B("19:00", "20:00", "長距離慢跑（擇一天）", "Long easy run (one day)", "move"), B("20:00", "20:30", "洗澡", "Shower", "rest"), B("20:30", "23:30", "娛樂時間", "Free time", "fun"), B("00:00", "", "手機下班、睡覺", "Phone off, sleep", "rest")]
};
const DEFAULT_HABITS = [
  { id: "wake", l: { zh: "準時起床", en: "Wake up on time" }, days: ["mwf", "tt", "wkd"] },
  { id: "focus", l: { zh: "專注學習", en: "Focused study" }, days: ["mwf", "tt"], auto: "focus" },
  { id: "move", l: { zh: "運動", en: "Exercise" }, days: ["mwf", "tt"] },
  { id: "shower", l: { zh: "回家先洗澡", en: "Shower first when home" }, days: ["mwf", "tt", "wkd"] },
  { id: "off", l: { zh: "手機準時下班", en: "Phone off on time" }, days: ["mwf", "tt", "wkd"] },
  { id: "piano", l: { zh: "練鋼琴", en: "Piano practice" }, days: ["mwf"] }
];
const SECTIONS = ["quote", "now", "habits", "tasks", "focus", "spend", "log", "exercise", "note"];
const DEFAULT_LAYOUT = [{ id: "quote", size: "full" }, { id: "now", size: "full" }, { id: "habits", size: "half" }, { id: "tasks", size: "half" }, { id: "focus", size: "half" }, { id: "spend", size: "half" }, { id: "log", size: "half" }, { id: "exercise", size: "half" }, { id: "note", size: "full" }];
const I = (zh, en, track) => ({ id: "i" + (++_n), l: { zh, en }, track, done: false });
const DEFAULT_ROADMAP = { start: "2026-11-02", weeks: [
  { id: "w1", items: [I("半導體製程總覽", "Semiconductor process overview", "main"), I("晶圓製造流程（前段到後段）", "Wafer flow, front end to back end", "main"), I("建立作息：固定起床＋回家先洗澡", "Build the routine: fixed wake-up + shower first", "side"), I("AI 產業與算力需求", "AI industry and compute demand", "int")] },
  { id: "w2", items: [I("微影", "Lithography", "main"), I("蝕刻", "Etching", "main"), I("碩論一頁式研究摘要初稿", "One-page thesis summary, first draft", "side"), I("區塊鏈應用與監管", "Blockchain use cases and regulation", "int")] },
  { id: "w3", items: [I("薄膜沉積（CVD／PVD／ALD）", "Thin-film deposition (CVD/PVD/ALD)", "main"), I("CMP 化學機械研磨", "CMP", "main"), I("SPC 統計製程管制基礎", "SPC basics", "side"), I("地緣政治與半導體出口管制", "Geopolitics and chip export controls", "int")] },
  { id: "w4", items: [I("離子佈植", "Ion implantation", "main"), I("擴散與熱製程", "Diffusion and thermal processes", "main"), I("DOE 與 FMEA 概念", "DOE and FMEA concepts", "side"), I("總體經濟與央行政策", "Macroeconomics and central banks", "int")] },
  { id: "w5", items: [I("後段封裝製程", "Back-end packaging", "main"), I("先進封裝（CoWoS、Fan-out、Chiplet）", "Advanced packaging (CoWoS, fan-out, chiplets)", "main"), I("研究摘要定稿", "Finalize thesis summary", "side"), I("AI 與半導體供應鏈", "AI and the chip supply chain", "int")] },
  { id: "w6", items: [I("總複習，整理成自己的筆記", "Full review, write your own notes", "main"), I("準備清單", "Preparation checklist", "side"), I("自選主題", "Topic of your choice", "int")] }
] };
const TOPICS = ["ai", "chain", "geo", "macro", "semi", "other"];
const FOCUS_TAGS = ["study", "english", "reading", "piano", "work", "other"];
function defaultSettings() {
  return { updatedAt: 0, lang: "zh", fontScale: 1, layout: clone(DEFAULT_LAYOUT), schedule: clone(DEFAULT_SCHEDULE), habits: clone(DEFAULT_HABITS), topics: TOPICS.slice(),
    focusGoal: 50, focusStrict: true, focusGrace: 10, notify: { enabled: false, morning: "07:50", evening: "22:00" }, vocabStart: ymd(today0()) };
}

/* ================= local store & migration ================= */
const LS = { data: "thelife.data.v2", meta: "thelife.meta.v2", auth: "thelife.auth.v2", state: "thelife.oauthstate", ret: "thelife.returnview", run: "thelife.focusrun" };
const OLD = { data: "simonlife.data.v1", meta: "simonlife.meta.v1" };
const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (_) { } };
const ABOUT = "The Life app 的資料檔。settings=設定（作息 schedule、習慣 habits、版面 layout、語言 lang、提醒 notify）；roadmap=學習路線；days=每日紀錄（以日期為鍵：habits 習慣完成、wake 起床、sleep 前一晚入睡、tasks 任務、ex 運動、energy 精神 1-5、spend 開銷 b早 l午 d晚 o其他、note 日記）；focus=專注紀錄（status done 完成／dead 枯萎，min 分鐘，tag 類別）；vocab=單字（mine 自己造的句子、known 已學會）；notes=趨勢筆記（deleted=true 表示已刪除）；reviews=週回顧（以 ISO 週為鍵）。updatedAt 為毫秒時間戳，用於跨裝置合併。";
const TAG_MAP = { "作息": "rest", "學習": "study", "興趣": "interest", "運動": "move", "生活": "life", "娛樂": "fun" };
const TOPIC_MAP = { "AI": "ai", "區塊鏈": "chain", "國際政治": "geo", "總經市場": "macro", "半導體": "semi", "其他": "other" };
function freshStore() { return { app: "The Life", schema: 2, _about: ABOUT, settings: defaultSettings(), roadmap: Object.assign(clone(DEFAULT_ROADMAP), { updatedAt: 0 }), days: {}, notes: {}, reviews: {}, focus: {}, vocab: {} }; }
function normalize(s) {
  const f = freshStore();
  if (!s || typeof s !== "object") return f;
  const st = Object.assign(defaultSettings(), s.settings && typeof s.settings === "object" ? s.settings : {});
  st.schedule = Object.assign(clone(DEFAULT_SCHEDULE), st.schedule || {});
  st.habits = Array.isArray(st.habits) ? st.habits : clone(DEFAULT_HABITS);
  st.topics = Array.isArray(st.topics) && st.topics.length ? st.topics : TOPICS.slice();
  st.notify = Object.assign({ enabled: false, morning: "07:50", evening: "22:00" }, st.notify || {});
  let lay = Array.isArray(st.layout) ? st.layout.filter(x => x && SECTIONS.includes(x.id)) : [];
  SECTIONS.forEach(id => { if (!lay.find(x => x.id === id)) lay.push(clone(DEFAULT_LAYOUT.find(x => x.id === id))); });
  st.layout = lay;
  const rm = s.roadmap && Array.isArray(s.roadmap.weeks) ? s.roadmap : f.roadmap;
  const obj = k => s[k] && typeof s[k] === "object" ? s[k] : {};
  return { app: "The Life", schema: 2, _about: ABOUT, settings: st, roadmap: rm, days: obj("days"), notes: obj("notes"), reviews: obj("reviews"), focus: obj("focus"), vocab: obj("vocab") };
}
function migrateV1(v1) {
  const s = freshStore();
  if (v1.settings && v1.settings.updatedAt) {
    const o = v1.settings;
    if (o.schedule) { ["mwf", "tt", "wkd"].forEach(k => { if (Array.isArray(o.schedule[k])) s.settings.schedule[k] = o.schedule[k].map(b => ({ id: b.id, start: b.start, end: b.end, label: b.label, tag: TAG_MAP[b.tag] || b.tag || "life" })); }); }
    s.settings.updatedAt = o.updatedAt;
  }
  if (v1.roadmap && v1.roadmap.updatedAt) s.roadmap = v1.roadmap;
  Object.entries(v1.days || {}).forEach(([k, d]) => { const x = clone(d); x.habits = x.habits || {}; if (x.habits.main) x.habits.focus = true; delete x.habits.main; delete x.habits.brief; delete x.habits.pm; s.days[k] = x; });
  Object.entries(v1.notes || {}).forEach(([k, n]) => { const x = clone(n); if (x.cat) x.cat = TOPIC_MAP[x.cat] || x.cat; s.notes[k] = x; });
  s.reviews = clone(v1.reviews || {});
  return s;
}
let migrated = false;
let store = (() => { const cur = lsGet(LS.data); if (cur) return normalize(cur); const v1 = lsGet(OLD.data); if (v1) { migrated = true; return normalize(migrateV1(v1)); } return freshStore(); })();
let meta = Object.assign({ fileId: null, lastSync: 0, dirty: false, email: "", name: "", linked: false, lastSilent: 0, syncError: "" }, lsGet(LS.meta) || {});
let auth = Object.assign({ token: null, exp: 0 }, lsGet(LS.auth) || {});
if (migrated) { meta.dirty = true; lsSet(LS.data, store); lsSet(LS.meta, meta); }
LANG = store.settings.lang === "en" ? "en" : "zh";
let editSeq = 0;
const saveMeta = () => lsSet(LS.meta, meta);
const touch = rec => { rec.updatedAt = Date.now(); };
function commit() { editSeq++; meta.dirty = true; if (!lsSet(LS.data, store)) toast(t("t_full")); saveMeta(); scheduleSync(); setSync(); }

/* ================= merge ================= */
const newer = (a, b) => { if (!a) return b; if (!b) return a; return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a; };
function mergeMap(a, b) { const out = {}; new Set(Object.keys(a || {}).concat(Object.keys(b || {}))).forEach(k => { out[k] = newer((a || {})[k], (b || {})[k]); }); return out; }
function merge(local, remote) {
  remote = normalize(remote);
  return normalize({ settings: newer(local.settings, remote.settings), roadmap: newer(local.roadmap, remote.roadmap),
    days: mergeMap(local.days, remote.days), notes: mergeMap(local.notes, remote.notes), reviews: mergeMap(local.reviews, remote.reviews),
    focus: mergeMap(local.focus, remote.focus), vocab: mergeMap(local.vocab, remote.vocab) });
}

/* ================= Google auth & Drive ================= */
const CFG = window.SIMON_CONFIG || window.THELIFE_CONFIG || {};
const CLIENT_ID = String(CFG.clientId || "").trim();
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FILE_NAME = "the-life-data.json";
const tokenValid = () => !!(auth.token && Date.now() < auth.exp);
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, "");
function signIn(silent) {
  if (!CLIENT_ID) { toast(t("t_noid")); return; }
  if (!navigator.onLine) { toast(t("t_nonet")); return; }
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
  if (q.get("access_token")) {
    auth = { token: q.get("access_token"), exp: Date.now() + (Number(q.get("expires_in")) || 3600) * 1000 - 60000 };
    lsSet(LS.auth, auth); meta.linked = true; meta.syncError = ""; saveMeta(); return "ok";
  }
  meta.syncError = st[1] === "s" ? "needauth" : (q.get("error") === "access_denied" ? "denied" : "autherror"); saveMeta();
  return "error";
}
function signOut() { auth = { token: null, exp: 0 }; lsSet(LS.auth, auth); Object.assign(meta, { linked: false, email: "", name: "", fileId: null, syncError: "" }); saveMeta(); setSync(); render(); toast(t("t_signedout")); }
async function gfetch(url, opt) {
  opt = opt || {};
  if (!tokenValid()) throw { status: 401 };
  const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + auth.token }, opt.headers || {}) }));
  if (r.status === 401) { auth = { token: null, exp: 0 }; lsSet(LS.auth, auth); throw { status: 401 }; }
  if (!r.ok) { let tx = ""; try { tx = await r.text(); } catch (_) { } throw { status: r.status, text: tx }; }
  return r;
}
async function findFile() {
  const q = encodeURIComponent("name='" + FILE_NAME + "' and trashed=false");
  const j = await (await gfetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&spaces=drive&orderBy=createdTime&pageSize=10&fields=files(id,createdTime)")).json();
  return j.files && j.files.length ? j.files[0].id : null;
}
async function download(id) { return (await gfetch("https://www.googleapis.com/drive/v3/files/" + id + "?alt=media")).json(); }
async function createFile(content) {
  const b = "thelife" + uid();
  const body = "--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify({ name: FILE_NAME, mimeType: "application/json", description: "The Life app 的資料檔（請勿手動改名）" }) +
    "\r\n--" + b + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + content + "\r\n--" + b + "--";
  return (await (await gfetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + b }, body })).json()).id;
}
async function updateFile(id, content) { await gfetch("https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media", { method: "PATCH", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: content }); }
async function loadProfile() { try { const j = await (await gfetch("https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)")).json(); if (j.user) { meta.email = j.user.emailAddress || ""; meta.name = j.user.displayName || ""; saveMeta(); } } catch (_) { } }

let syncing = false, again = false, syncTimer = null, syncState = "";
function setSync(s) {
  if (s != null) syncState = s;
  const p = document.getElementById("statusPill"); if (!p) return;
  let txt = t("st_local"), cls = "";
  if (!CLIENT_ID) txt = t("st_local");
  else if (syncState === "syncing") txt = t("st_syncing");
  else if (!navigator.onLine) { txt = meta.dirty ? t("st_offline_p") : t("st_offline"); cls = "warn"; }
  else if (!tokenValid() && meta.linked) { txt = t("st_relink"); cls = "warn"; }
  else if (!meta.linked) { txt = t("st_unlinked"); cls = "warn"; }
  else if (syncState === "error") { txt = t("st_fail"); cls = "bad"; }
  else if (meta.dirty) txt = t("st_pending");
  else { txt = t("st_ok", fmtTime(meta.lastSync).split(" ")[1]); cls = "ok"; }
  p.textContent = txt; p.className = "pill " + cls;
}
function scheduleSync(delay) { clearTimeout(syncTimer); if (!tokenValid()) return; syncTimer = setTimeout(sync, delay == null ? 1500 : delay); }
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
    store = merged; lsSet(LS.data, store); LANG = store.settings.lang === "en" ? "en" : "zh";
    if (!id) id = await createFile(mergedStr);
    else if (meta.dirty || mergedStr !== JSON.stringify(normalize(remote))) await updateFile(id, mergedStr);
    meta.fileId = id; meta.lastSync = Date.now(); meta.syncError = "";
    if (editSeq === seq) meta.dirty = false; else again = true;
    saveMeta(); syncState = "ok";
    if (!meta.email) loadProfile().then(() => { if (S.view === "settings") render(); });
    render();
  } catch (e) {
    if (e && e.status === 401) { meta.syncError = "needauth"; syncState = "needauth"; }
    else { meta.syncError = navigator.onLine ? "error" : "offline"; syncState = "error"; }
    saveMeta(); if (S.view === "settings") render();
  } finally { syncing = false; setSync(); if (again) { again = false; scheduleSync(500); } }
}

/* ================= view state ================= */
const VIEWS = ["today", "yesterday", "focus", "vocab", "schedule", "learn", "notes", "review", "settings"];
const S = {
  view: "today", date: ymd(today0()), schedTab: dayType(today0()), editSched: false, editHabits: false, editRm: false, editLayout: false,
  noteKind: "insight", noteFilter: "all", noteCat: "ai", confirmDel: null, composerOpen: false,
  week: ymd(mondayOf(today0())), installEvt: null, confirmSignOut: false,
  vDate: ymd(today0()), fMin: 25, fTag: "study", fConfirmGiveUp: false, speaking: null
};
const getDay = d => store.days[d] || { date: d, habits: {}, wake: "", sleep: "", tasks: [], ex: {}, energy: 0, note: "", spend: {} };
const ensureDay = d => { if (!store.days[d]) store.days[d] = getDay(d); const x = store.days[d]; x.date = d; x.habits = x.habits || {}; x.tasks = x.tasks || []; x.ex = x.ex || {}; x.spend = x.spend || {}; return x; };
const notesList = () => Object.values(store.notes).filter(n => n && !n.deleted).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
const changeDay = d => { touch(store.days[d]); commit(); };
const changeSettings = () => { touch(store.settings); commit(); };
const changeRoadmap = () => { touch(store.roadmap); commit(); };
const habitsFor = d => store.settings.habits.filter(h => (h.days || []).includes(dayType(d)));
const focusList = date => Object.values(store.focus).filter(f => f && f.date === date && !f.deleted);
const focusMinutes = date => focusList(date).filter(f => f.status === "done").reduce((a, f) => a + num(f.min), 0);
function habitDone(dstr, h) { const day = store.days[dstr]; if (day && day.habits && day.habits[h.id]) return true; if (h.auto === "focus") return focusMinutes(dstr) >= num(store.settings.focusGoal || 50); return false; }
function streak(h) {
  let n = 0, d = today0();
  for (let i = 0; i < 400; i++) {
    if ((h.days || []).includes(dayType(d))) { if (habitDone(ymd(d), h)) n++; else if (i > 0) break; }
    d = addDays(d, -1);
  }
  return n;
}
const spendTotal = day => { const s = (day && day.spend) || {}; return num(s.b) + num(s.l) + num(s.d) + num(s.o); };

/* ================= render plumbing ================= */
let renderQueued = false;
function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = VIEWS.map(v => `<button class="tab" data-act="nav" data-v="${v}" aria-current="${v === S.view ? "page" : "false"}">${esc(t("tab_" + v))}</button>`).join("");
  const cur = nav.querySelector('[aria-current="page"]'); if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (_) { } }
}
function render() {
  const ae = document.activeElement;
  if (ae && ae.id && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") && document.getElementById("view").contains(ae) && ae.type !== "file") { renderQueued = true; renderChrome(); return; }
  const fid = ae && ae.id;
  document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant-TW";
  const app = document.getElementById("app");
  const sc = num(store.settings.fontScale) || 1; app.style.zoom = sc === 1 ? "" : String(sc);
  renderTabs();
  document.getElementById("view").innerHTML = ({ today: vToday, yesterday: vYesterday, focus: vFocus, vocab: vVocab, schedule: vSchedule, learn: vLearn, notes: vNotes, review: vReview, settings: vSettings }[S.view] || vToday)();
  if (fid) { const f = document.getElementById(fid); if (f) f.focus({ preventScroll: true }); }
  renderChrome();
}
function renderChrome() {
  document.getElementById("tagline").textContent = t("tagline");
  document.getElementById("foot").textContent = t("foot");
  setSync();
}
document.addEventListener("focusout", () => { setTimeout(() => { if (renderQueued) { const ae = document.activeElement; if (!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))) { renderQueued = false; render(); } } }, 0); });
function syncBanner() {
  if (!CLIENT_ID || S.view === "settings") return "";
  if (!meta.linked) return `<div class="banner"><p>${esc(t("b_link"))}</p><button class="btn primary" data-act="signin">${esc(t("b_link_btn"))}</button></div>`;
  if (!tokenValid() && navigator.onLine) return `<div class="banner"><p>${esc(t("b_expired"))}</p><button class="btn primary" data-act="signin">${esc(t("s_relink"))}</button></div>`;
  return "";
}

/* ================= today ================= */
function blocksFor(type) { return (store.settings.schedule[type] || []).slice().sort((a, b) => (toMin(a.start) ?? 0) - (toMin(b.start) ?? 0)); }
function nowInfo() {
  const n = new Date(), tm = n.getHours() * 60 + n.getMinutes(), bl = blocksFor(dayType(n));
  let cur = null;
  bl.forEach((b, i) => { const s = toMin(b.start), e = toMin(b.end) ?? (bl[i + 1] ? toMin(bl[i + 1].start) : 1440); if (s != null && s <= tm && tm < e) cur = b; });
  return { cur, next: bl.find(b => (toMin(b.start) ?? -1) > tm) || null, clock: pad(n.getHours()) + ":" + pad(n.getMinutes()) };
}
function quoteFor(d) { const Q = window.TL_QUOTES || []; if (!Q.length) return null; const idx = ((Math.floor(parseYmd(ymd(d)).getTime() / 864e5) * 7) % Q.length + Q.length) % Q.length; return Q[idx]; }
const SEC = {
  quote(d) { const q = quoteFor(d); if (!q) return ""; return `<div class="quote"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div class="en">${esc(q[0])}</div>${ttsOk() ? `<button class="speak" data-act="say" data-text="${esc(q[0])}" aria-label="${esc(t("v_play"))}">${SPEAKER}</button>` : ""}</div><div class="zh">${esc(q[1])}</div><div class="by">— ${esc(q[2])}</div></div>`; },
  now(d, isToday) {
    if (!isToday) return "";
    const ni = nowInfo();
    return `<section class="now" aria-live="polite"><div><div class="eyebrow">${esc(t("now"))} · ${esc(DT(dayType(d)))}</div>
      <div class="lbl">${ni.cur ? esc(L(ni.cur)) : esc(t("free_time"))}</div>
      <div class="tm">${ni.cur ? esc(ni.cur.start) + (ni.cur.end ? "–" + esc(ni.cur.end) : "") : ""}</div>
      <div class="nx">${ni.next ? esc(t("next_up")) + " " + esc(ni.next.start) + " · " + esc(L(ni.next)) : esc(t("day_done"))}</div></div>
      <div class="clock" id="clock">${ni.clock}</div></section>`;
  },
  habits(d) {
    const ds = ymd(d), hs = habitsFor(d), done = hs.filter(h => habitDone(ds, h)).length;
    return `<section class="card"><h2>${esc(t("sec_habits"))} <span class="count">${done}/${hs.length}</span></h2>
      <div class="meter" aria-hidden="true"><i style="width:${hs.length ? Math.round(done / hs.length * 100) : 0}%"></i></div>
      <div class="checks">${hs.map(h => { const dn = habitDone(ds, h), sk = streak(h);
        return `<button class="check" id="h-${esc(h.id)}" data-act="habit" data-id="${esc(h.id)}" aria-pressed="${dn}"><span class="box">${CHECK}</span><span class="txt">${esc(L(h))}${h.auto === "focus" ? ` <span class="auto">${esc(store.settings.focusGoal)}′</span>` : ""}</span>${sk > 1 ? `<span class="streak">${esc(t("streak", sk))}</span>` : ""}</button>`; }).join("") || `<p class="sub">${esc(t("no_habits"))}</p>`}</div></section>`;
  },
  tasks(d) {
    const ds = ymd(d), tasks = getDay(ds).tasks || [];
    return `<section class="card"><h2>${esc(t("sec_tasks"))} <span class="count">${tasks.filter(x => x.done).length}/${tasks.length}</span></h2>
      <div class="tasks">${tasks.map(x => `<div class="task"><button class="check" id="t-${esc(x.id)}" data-act="task" data-date="${ds}" data-id="${esc(x.id)}" aria-pressed="${!!x.done}"><span class="box">${CHECK}</span><span class="txt">${esc(x.text)}</span></button><button class="btn small danger" data-act="task-del" data-date="${ds}" data-id="${esc(x.id)}">${esc(t("del"))}</button></div>`).join("")}</div>
      ${tasks.length < 5 ? `<form class="row" data-form="task" data-date="${ds}" style="margin-top:10px"><input id="newTask-${ds}" placeholder="${esc(t("task_ph"))}" maxlength="80" enterkeyhint="done" style="flex:1 1 180px"><button class="btn primary" type="submit">${esc(t("add"))}</button></form>` : `<p class="sub" style="margin:10px 0 0">${esc(t("task_max"))}</p>`}
      ${tasks.length === 0 ? `<p class="sub" style="margin:8px 0 0">${esc(t("task_tip"))}</p>` : ""}</section>`;
  },
  focus(d) {
    const ds = ymd(d), m = focusMinutes(ds), goal = num(store.settings.focusGoal) || 50, trees = focusList(ds);
    return `<section class="card"><h2>${esc(t("sec_focus"))} <span class="count">${m}/${goal}′</span></h2>
      <div class="meter" aria-hidden="true"><i style="width:${Math.min(100, Math.round(m / goal * 100))}%"></i></div>
      <div class="forest" style="margin-top:10px">${trees.map(f => `<div class="t" title="${esc(f.min)}′">${treeSVG(f.status === "done" ? 1 : .6, f.status !== "done")}</div>`).join("")}</div>
      <div class="row" style="margin-top:10px"><span class="sub">${esc(t("focus_today", m))}</span><span class="spacer"></span><button class="btn primary small" data-act="nav" data-v="focus">${esc(FRUN ? t("focus_running") : t("focus_go"))}</button></div></section>`;
  },
  spend(d) {
    const ds = ymd(d), sp = getDay(ds).spend || {};
    const f = (k, lab) => `<label class="f">${esc(lab)}<input type="number" min="0" inputmode="numeric" id="sp-${k}" data-day="spend.${k}" value="${esc(sp[k])}" placeholder="0"></label>`;
    return `<section class="card"><h2>${esc(t("sec_spend"))}</h2><div class="fgrid">${f("b", t("sp_b"))}${f("l", t("sp_l"))}${f("d", t("sp_d"))}${f("o", t("sp_o"))}</div>
      ${sp.o ? `<label class="f" style="margin-top:10px">${esc(t("sp_onote"))}<input id="sp-onote" data-day="spend.oNote" value="${esc(sp.oNote)}"></label>` : ""}
      <div class="total"><span class="sub">${esc(t("sp_total"))}</span><b id="spTotal">${money(spendTotal(getDay(ds)))}</b></div></section>`;
  },
  log(d) {
    const day = getDay(ymd(d));
    return `<section class="card"><h2>${esc(t("sec_log"))}</h2><div class="fgrid">
      <label class="f">${esc(t("wake"))}<input type="time" id="f-wake" data-day="wake" value="${esc(day.wake)}"></label>
      <label class="f">${esc(t("slept"))}<input type="time" id="f-sleep" data-day="sleep" value="${esc(day.sleep)}"></label></div>
      <div style="margin-top:12px"><div class="sub" style="margin-bottom:6px">${esc(t("energy"))}</div>
      <div class="dots">${[1, 2, 3, 4, 5].map(n => `<button id="en-${n}" data-act="energy" data-v="${n}" aria-pressed="${day.energy === n}">${n}</button>`).join("")}</div></div></section>`;
  },
  exercise(d) {
    const ex = getDay(ymd(d)).ex || {}, types = t("ex_types"), keys = ["basket", "run", "strength", "runstr", "other"];
    const legacy = { "投籃": "basket", "跑步": "run", "肌力": "strength", "跑步＋肌力": "runstr", "其他": "other" };
    const cur = legacy[ex.type] || ex.type || "";
    return `<section class="card"><h2>${esc(t("sec_exercise"))}</h2><div class="fgrid">
      <label class="f">${esc(t("ex_type"))}<select id="f-ex-type" data-day="ex.type"><option value="">${esc(t("ex_none"))}</option>${keys.map((k, i) => `<option value="${k}"${cur === k ? " selected" : ""}>${esc(types[i])}</option>`).join("")}</select></label>
      <label class="f">${esc(t("ex_min"))}<input type="number" min="0" inputmode="numeric" id="f-ex-min" data-day="ex.min" value="${esc(ex.min)}"></label>
      <label class="f">${esc(t("ex_km"))}<input type="number" min="0" step="0.1" inputmode="decimal" id="f-ex-km" data-day="ex.km" value="${esc(ex.km)}"></label>
      <label class="f">${esc(t("ex_push"))}<input type="number" min="0" inputmode="numeric" id="f-ex-push" data-day="ex.push" value="${esc(ex.push)}"></label></div></section>`;
  },
  note(d) { const day = getDay(ymd(d)); return `<section class="card"><h2>${esc(t("sec_note"))}</h2><textarea id="f-note" data-day="note" placeholder="${esc(t("note_ph"))}">${esc(day.note)}</textarea></section>`; }
};
function vToday() {
  const d = parseYmd(S.date), isToday = S.date === ymd(today0());
  const lay = store.settings.layout, shown = lay.filter(x => !x.hidden), hidden = lay.filter(x => x.hidden);
  const slots = shown.map((x, i) => {
    let inner = SEC[x.id] ? SEC[x.id](d, isToday) : "";
    if (!inner && !S.editLayout) return "";
    if (!inner) inner = `<div class="card sub">${esc(t("sec_" + x.id))}</div>`;
    const tools = S.editLayout ? `<div class="tools"><span class="lbl">${esc(t("sec_" + x.id))}</span>
      <button class="btn small icon" data-act="lay-up" data-id="${x.id}" aria-label="${esc(t("move_up"))}"${i === 0 ? " disabled" : ""}>↑</button>
      <button class="btn small icon" data-act="lay-down" data-id="${x.id}" aria-label="${esc(t("move_down"))}"${i === shown.length - 1 ? " disabled" : ""}>↓</button>
      <button class="btn small" data-act="lay-size" data-id="${x.id}">${esc(x.size === "full" ? t("narrow") : t("wide"))}</button>
      <button class="btn small" data-act="lay-hide" data-id="${x.id}">${esc(t("hide"))}</button></div>` : "";
    return `<div class="slot ${x.size === "full" ? "full" : "half"}${S.editLayout ? " editing" : ""}">${tools}${inner}</div>`;
  }).join("");
  const edit = S.editLayout ? `<div class="editbar"><span style="flex:1 1 220px">${esc(t("layout_tip"))}</span>
      ${hidden.length ? `<span class="sub">${esc(t("hidden_secs"))}</span>${hidden.map(x => `<button class="chip" data-act="lay-show" data-id="${x.id}">＋ ${esc(t("sec_" + x.id))}</button>`).join("")}` : ""}
      <button class="btn small" data-act="lay-reset">${esc(t("reset_layout"))}</button><button class="btn primary small" data-act="lay-edit">${esc(t("done_edit"))}</button></div>` : "";
  return `${syncBanner()}
  <div class="datebar"><button class="btn icon" data-act="day-prev" aria-label="${esc(t("prev_day"))}">‹</button>
    <span class="d">${md(d)}（${esc(WD(d.getDay()))}）</span><span class="pill">${esc(DT(dayType(d)))}</span>
    <button class="btn icon" data-act="day-next" aria-label="${esc(t("next_day"))}">›</button>
    ${isToday ? "" : `<button class="btn small" data-act="day-today">${esc(t("back_today"))}</button>`}
    <span class="spacer"></span>${S.editLayout ? "" : `<button class="btn small" data-act="lay-edit">${esc(t("edit_layout"))}</button>`}</div>
  ${edit}<div class="dash">${slots}</div>`;
}

/* ================= yesterday ================= */
function vYesterday() {
  const y = addDays(today0(), -1), ys = ymd(y), ts = ymd(today0()), day = store.days[ys];
  const hs = habitsFor(y), fm = focusMinutes(ys), trees = focusList(ys);
  const todayTasks = getDay(ts).tasks || [];
  const exTypes = t("ex_types"), exKeys = ["basket", "run", "strength", "runstr", "other"];
  const exName = day && day.ex && day.ex.type ? (exTypes[exKeys.indexOf(day.ex.type)] || day.ex.type) : "—";
  const has = !!day || trees.length;
  return `${syncBanner()}
  <div class="datebar"><span class="d">${esc(t("y_title"))} ${md(y)}（${esc(WD(y.getDay()))}）</span><span class="pill">${esc(DT(dayType(y)))}</span></div>
  ${has ? `<div class="stats">
    <div class="stat"><div class="v">${hs.filter(h => habitDone(ys, h)).length}/${hs.length}</div><div class="k">${esc(t("y_habits"))}</div></div>
    <div class="stat"><div class="v">${fm}′</div><div class="k">${esc(t("y_focus"))} · ${trees.filter(f => f.status === "done").length} ${esc(t("f_live"))}</div></div>
    <div class="stat"><div class="v">${day ? money(spendTotal(day)) : "—"}</div><div class="k">${esc(t("y_spend"))}</div></div>
    <div class="stat"><div class="v" style="font-size:18px">${esc(exName)}${day && day.ex && day.ex.min ? " · " + esc(day.ex.min) + "′" : ""}</div><div class="k">${esc(t("y_ex"))}</div></div>
  </div>` : `<div class="empty">${esc(t("y_nodata"))}</div>`}
  <div class="grid2">
    <section class="card"><h2>${esc(t("y_habits"))}</h2><div class="ylist">${hs.map(h => { const dn = habitDone(ys, h); return `<div class="yitem${dn ? "" : " miss"}"><span class="mark ${dn ? "y" : "n"}">${dn ? "✓" : ""}</span><span class="txt">${esc(L(h))}</span></div>`; }).join("") || `<p class="sub">${esc(t("no_habits"))}</p>`}</div></section>
    <section class="card"><h2>${esc(t("y_tasks"))}</h2><div class="ylist">${(day && day.tasks && day.tasks.length) ? day.tasks.map(x => `<div class="yitem${x.done ? "" : " miss"}"><span class="mark ${x.done ? "y" : "n"}">${x.done ? "✓" : ""}</span><span class="txt">${esc(x.text)}</span>${!x.done ? (x.moved ? `<span class="sub">${esc(t("y_moved"))}</span>` : `<button class="btn small" data-act="y-move" data-id="${esc(x.id)}">${esc(t("y_move"))}</button>`) : ""}</div>`).join("") : `<p class="sub">${esc(t("y_none_tasks"))}</p>`}</div></section>
  </div>
  ${day && day.note ? `<section class="card"><h2>${esc(t("y_note"))}</h2><div style="white-space:pre-wrap">${esc(day.note)}</div></section>` : ""}
  ${SEC.tasks(today0()).replace(esc(t("sec_tasks")), esc(t("y_today")))}`;
}

/* ================= focus (forest) ================= */
let FRUN = lsGet(LS.run);
let fTimer = null, wakeLock = null;
function treeSVG(p, dead) {
  p = Math.max(0, Math.min(1, p));
  const trunkH = 6 + 34 * p, topY = 92 - trunkH, r = 4 + 22 * Math.min(1, p * 1.15);
  const leaf = dead ? "var(--muted)" : "var(--leaf)", leaf2 = dead ? "var(--line)" : "var(--leaf-2)", bark = dead ? "var(--muted)" : "var(--bark)";
  let g = `<ellipse cx="50" cy="93" rx="30" ry="5" fill="var(--soil)"/>`;
  if (p < 0.08) return `<svg viewBox="0 0 100 100" aria-hidden="true">${g}<ellipse cx="50" cy="88" rx="5" ry="4" fill="${bark}"/></svg>`;
  g += `<rect x="${50 - 2 - 2 * p}" y="${topY}" width="${4 + 4 * p}" height="${trunkH}" rx="2" fill="${bark}"/>`;
  if (p > .45) g += `<circle cx="${50 - r * .7}" cy="${topY + r * .35}" r="${r * .62}" fill="${leaf2}"/><circle cx="${50 + r * .7}" cy="${topY + r * .35}" r="${r * .62}" fill="${leaf2}"/>`;
  g += `<circle cx="50" cy="${topY - r * .2}" r="${r}" fill="${leaf}"/>`;
  if (dead) g += `<path d="M${50 - r * .5} ${topY - r * .5} l${r} ${r * .6}" stroke="var(--surface)" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${g}</svg>`;
}
function ringSVG(frac) {
  const R = 46, C = 2 * Math.PI * R;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="4"/><circle id="ringArc" cx="50" cy="50" r="${R}" fill="none" stroke="var(--leaf)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 50 50)"/></svg>`;
}
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); };
async function keepAwake() { try { if (navigator.wakeLock && document.visibilityState === "visible") wakeLock = await navigator.wakeLock.request("screen"); } catch (_) { } }
function releaseAwake() { try { if (wakeLock) wakeLock.release(); } catch (_) { } wakeLock = null; }
function startFocus() {
  if (FRUN) return;
  const min = Math.max(5, Math.min(180, Math.round(num(S.fMin) || 25)));
  const now = Date.now();
  FRUN = { id: "f" + uid(), start: now, end: now + min * 60000, min, tag: S.fTag, hiddenAt: null };
  lsSet(LS.run, FRUN); S.fConfirmGiveUp = false; keepAwake(); startTicker(); render();
}
function finishFocus(status) {
  if (!FRUN) return;
  const f = { id: FRUN.id, date: ymd(new Date(FRUN.start)), start: FRUN.start, end: Math.min(Date.now(), FRUN.end), min: FRUN.min, tag: FRUN.tag, status };
  touch(f); store.focus[f.id] = f; FRUN = null; lsDel(LS.run); releaseAwake(); stopTicker(); commit();
  if (status === "done") { chime(); try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (_) { } toast(t("f_done", f.min)); }
  else toast(t("f_dead"));
  render();
}
function checkFocus() {
  if (!FRUN) return;
  const now = Date.now();
  if (FRUN.hiddenAt) {
    const away = Math.min(now, FRUN.end) - FRUN.hiddenAt;
    if (store.settings.focusStrict && away > (num(store.settings.focusGrace) || 10) * 1000) { finishFocus("dead"); return; }
    FRUN.hiddenAt = null; lsSet(LS.run, FRUN);
  }
  if (now >= FRUN.end) finishFocus("done");
}
function startTicker() {
  stopTicker();
  fTimer = setInterval(() => {
    if (!FRUN) { stopTicker(); return; }
    if (document.visibilityState !== "visible") return;
    const now = Date.now(); if (now >= FRUN.end) { finishFocus("done"); return; }
    const frac = (now - FRUN.start) / (FRUN.end - FRUN.start);
    const el = document.getElementById("fTime"); if (el) el.textContent = mmss(FRUN.end - now);
    const arc = document.getElementById("ringArc"); if (arc) { const C = 2 * Math.PI * 46; arc.setAttribute("stroke-dashoffset", String(C * (1 - frac))); }
    const tr = document.getElementById("fTree"); if (tr && Math.floor(frac * 40) !== +tr.dataset.s) { tr.dataset.s = Math.floor(frac * 40); tr.innerHTML = treeSVG(frac, false); }
  }, 500);
}
function stopTicker() { if (fTimer) clearInterval(fTimer); fTimer = null; }
function chime() { try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const ctx = new A(); [523.25, 659.25, 783.99].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, ctx.currentTime + i * .18); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * .18 + .02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * .18 + .5); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * .18); o.stop(ctx.currentTime + i * .18 + .55); }); } catch (_) { } }
function vFocus() {
  const ts = ymd(today0()), goal = num(store.settings.focusGoal) || 50;
  let stage;
  if (FRUN) {
    const now = Date.now(), frac = Math.min(1, (now - FRUN.start) / (FRUN.end - FRUN.start));
    stage = `<section class="card"><div class="focus-stage">
      <div class="eyebrow">${esc(t("f_tags")[FRUN.tag] || FRUN.tag)} · ${FRUN.min} ${esc(t("f_minutes"))}</div>
      <div class="ring">${ringSVG(frac)}<div class="tree" id="fTree" data-s="${Math.floor(frac * 40)}">${treeSVG(frac, false)}</div></div>
      <div class="timer" id="fTime">${mmss(FRUN.end - now)}</div>
      <div class="sub">${esc(t("f_growing"))}</div>
      <p class="sub" style="max-width:36ch;margin:0">${esc(store.settings.focusStrict ? t("f_rule", store.settings.focusGrace) : t("f_rule_off"))}</p>
      <button class="btn danger" data-act="f-giveup">${esc(S.fConfirmGiveUp ? t("f_giveup2") : t("f_giveup"))}</button>
    </div></section>`;
  } else {
    const opts = [10, 25, 45, 60, 90];
    stage = `<section class="card"><div class="focus-stage">
      <div class="ring">${ringSVG(0)}<div class="tree">${treeSVG(0.12, false)}</div></div>
      <div class="timer">${pad(S.fMin)}:00</div>
      <div class="sub">${esc(t("f_pick"))}</div>
      <div class="durs">${opts.map(m => `<button class="chip" data-act="f-min" data-v="${m}" aria-pressed="${S.fMin === m}">${m}′</button>`).join("")}</div>
      <input type="range" id="fRange" min="5" max="120" step="5" value="${S.fMin}" aria-label="${esc(t("f_custom"))}" style="max-width:320px;padding:0;background:none;border:0;accent-color:var(--leaf)">
      <div class="sub">${esc(t("f_tag"))}</div>
      <div class="chips" style="justify-content:center">${FOCUS_TAGS.map(k => `<button class="chip" data-act="f-tag" data-v="${k}" aria-pressed="${S.fTag === k}">${esc(t("f_tags")[k])}</button>`).join("")}</div>
      <button class="btn primary" data-act="f-start" style="font-size:16px;padding:10px 28px">${esc(t("f_start"))}</button>
      <p class="sub" style="max-width:40ch;margin:0">${esc(store.settings.focusStrict ? t("f_rule", store.settings.focusGrace) : t("f_rule_off"))}</p>
    </div></section>`;
  }
  const trees = focusList(ts), todayMin = focusMinutes(ts);
  const mon = mondayOf(today0()); let weekMin = 0; for (let i = 0; i < 7; i++) weekMin += focusMinutes(ymd(addDays(mon, i)));
  const all = Object.values(store.focus).filter(f => f && !f.deleted), grown = all.filter(f => f.status === "done").length, dead = all.length - grown;
  const last7 = [...Array(7)].map((_, i) => addDays(today0(), i - 6));
  const vals = last7.map(d => focusMinutes(ymd(d))), mx = Math.max(goal, ...vals);
  const W = 560, H = 160, Lp = 36, Rp = 10, Tp = 12, Bp = 24, pw = W - Lp - Rp, ph = H - Tp - Bp, bw = pw / 7 * .56;
  const y = v => Tp + ph - v / mx * ph;
  let bars = `<line x1="${Lp}" x2="${W - Rp}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--copper)" stroke-dasharray="4 4"/><text x="${W - Rp}" y="${y(goal) - 5}" text-anchor="end" font-size="11" fill="var(--copper)">${esc(t("r_target"))} ${goal}′</text>`;
  bars += `<line x1="${Lp}" x2="${W - Rp}" y1="${Tp + ph}" y2="${Tp + ph}" stroke="var(--line)"/><text x="${Lp - 6}" y="${Tp + ph + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--f-mono)">0</text><text x="${Lp - 6}" y="${y(mx) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--f-mono)">${Math.round(mx)}</text>`;
  last7.forEach((d, i) => { const cx = Lp + pw / 7 * (i + .5), v = vals[i]; bars += `<rect x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, Tp + ph - y(v))}" rx="3" fill="${i === 6 ? "var(--leaf)" : "var(--leaf-2)"}"><title>${md(d)} ${v}′</title></rect><text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="10" font-family="var(--f-mono)" fill="var(--muted)">${md(d)}</text>`; if (v) bars += `<text x="${cx}" y="${y(v) - 4}" text-anchor="middle" font-size="10" font-family="var(--f-mono)" fill="var(--ink)">${v}</text>`; });
  return `${stage}
  <div class="stats">
    <div class="stat"><div class="v">${todayMin}′</div><div class="k">${esc(t("f_stats_today"))}</div></div>
    <div class="stat"><div class="v">${weekMin}′</div><div class="k">${esc(t("f_stats_week"))}</div></div>
    <div class="stat"><div class="v">${grown}</div><div class="k">${esc(t("f_stats_trees"))}</div></div>
    <div class="stat"><div class="v">${dead}</div><div class="k">${esc(t("f_stats_dead"))}</div></div>
  </div>
  <section class="card"><h2>${esc(t("f_forest"))} <span class="legend"><span>● ${esc(t("f_live"))}</span><span>○ ${esc(t("f_withered"))}</span></span></h2>
    ${trees.length ? `<div class="forest">${trees.map(f => `<div class="t" title="${esc(t("f_tags")[f.tag] || "")} ${esc(f.min)}′">${treeSVG(f.status === "done" ? Math.min(1, .55 + f.min / 120) : .6, f.status !== "done")}</div>`).join("")}</div>` : `<p class="sub" style="margin:0">${esc(t("f_empty"))}</p>`}
  </section>
  <section class="card"><h2>${esc(t("f_week"))}</h2><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("f_week"))}">${bars}</svg></div></section>`;
}

/* ================= vocab & speech ================= */
const ttsOk = () => "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
let enVoice = null;
function pickVoice() { if (!ttsOk()) return; const vs = speechSynthesis.getVoices(); enVoice = vs.find(v => /en[-_]US/i.test(v.lang) && /Google|Samantha|Aria|Jenny/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
if (ttsOk()) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); } catch (_) { } }
function say(text, btn) {
  if (!ttsOk() || !text) return;
  speechSynthesis.cancel();
  document.querySelectorAll(".speak.on").forEach(b => b.classList.remove("on"));
  const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; if (enVoice) u.voice = enVoice;
  if (btn) { btn.classList.add("on"); u.onend = u.onerror = () => btn.classList.remove("on"); }
  speechSynthesis.speak(u);
}
function vocabDay(dstr) {
  const V = window.TL_VOCAB || []; const per = 5, days = Math.max(1, Math.floor(V.length / per));
  const n = Math.max(0, daysBetween(parseYmd(store.settings.vocabStart || ymd(today0())), parseYmd(dstr)));
  const idx = n % days;
  return { n: n + 1, cycled: n >= days, words: V.slice(idx * per, idx * per + per) };
}
function vVocab() {
  const d = parseYmd(S.vDate), isToday = S.vDate === ymd(today0()), vd = vocabDay(S.vDate);
  const known = Object.values(store.vocab).filter(v => v && v.known).length;
  const start = parseYmd(store.settings.vocabStart || ymd(today0()));
  const canPrev = d > start;
  const sp = w => ttsOk() ? `<button class="speak" data-act="say" data-text="${esc(w)}" aria-label="${esc(t("v_play"))}">${SPEAKER}</button>` : "";
  return `${syncBanner()}
  <div class="datebar"><button class="btn icon" data-act="v-prev" aria-label="${esc(t("prev_day"))}"${canPrev ? "" : " disabled"}>‹</button>
    <span class="d">${esc(t("v_title"))} · ${esc(t("v_day", vd.n))}</span><span class="pill">${md(d)}</span>
    <button class="btn icon" data-act="v-next" aria-label="${esc(t("next_day"))}"${isToday ? " disabled" : ""}>›</button>
    ${isToday ? "" : `<button class="btn small" data-act="v-today">${esc(t("back_today"))}</button>`}
    <span class="spacer"></span><span class="count">${esc(t("v_learned", known))}</span>
    ${ttsOk() ? `<button class="btn small" data-act="say-all">${esc(t("v_all"))}</button>` : ""}</div>
  ${vd.cycled ? `<p class="sub" style="margin:0">${esc(t("v_cycle"))}</p>` : ""}
  ${ttsOk() ? "" : `<p class="sub" style="margin:0">${esc(t("v_no_tts"))}</p>`}
  <div class="grid2">${vd.words.map(v => { const key = v[0], st = store.vocab[key] || {};
    return `<section class="card word">
      <div class="row" style="flex-wrap:nowrap"><span class="w">${esc(v[0])}</span>${sp(v[0])}<span class="spacer"></span><button class="btn small known" data-act="v-known" data-w="${esc(key)}" aria-pressed="${!!st.known}">${st.known ? "✓ " : ""}${esc(t("v_known"))}</button></div>
      <div><span class="pos">${esc(v[1])}</span> · ${esc(v[2])}</div>
      <div class="exrow">${sp(v[3])}<div style="min-width:0"><div class="ex">${esc(v[3])}</div><div class="exzh">${esc(v[4])}</div></div></div>
      <div class="exrow">${st.mine && ttsOk() ? sp(st.mine) : ""}<label class="f" style="flex:1;min-width:0">${esc(t("v_mine", v[0]))}<textarea id="vm-${esc(key.replace(/[^A-Za-z0-9]/g, "_"))}" data-vocab="${esc(key)}" rows="2">${esc(st.mine)}</textarea></label></div>
    </section>`; }).join("")}</div>`;
}

/* ================= schedule & habits ================= */
function vSchedule() {
  const type = S.schedTab, bl = blocksFor(type), isTodayType = type === dayType(new Date()), ni = nowInfo();
  const rows = bl.map(b => {
    if (S.editSched) return `<div class="tl edit">
      <input type="time" id="s-${b.id}-start" data-sched="start" data-id="${b.id}" value="${esc(b.start)}" aria-label="${esc(t("start"))}">
      <input type="time" id="s-${b.id}-end" data-sched="end" data-id="${b.id}" value="${esc(b.end)}" aria-label="${esc(t("end"))}">
      <input class="lab" id="s-${b.id}-label" data-sched="label" data-id="${b.id}" value="${esc(L(b))}" aria-label="${esc(t("content"))}">
      <select id="s-${b.id}-tag" data-sched="tag" data-id="${b.id}" aria-label="${esc(t("category"))}">${Object.keys(T.zh.tags).map(k => `<option value="${k}"${b.tag === k ? " selected" : ""}>${esc(t("tags")[k])}</option>`).join("")}</select>
      <button class="btn small danger" data-act="sched-del" data-id="${b.id}">${esc(t("del"))}</button></div>`;
    const cur = isTodayType && ni.cur && ni.cur.id === b.id;
    return `<div class="tl${cur ? " cur" : ""}"><span class="t">${esc(b.start)}${b.end ? "–" + esc(b.end) : ""}</span><span>${esc(L(b))}</span><span class="tag" data-tag="${esc(b.tag)}">${esc(t("tags")[b.tag] || b.tag)}</span></div>`;
  }).join("");
  const hs = store.settings.habits;
  return `${syncBanner()}
  <section class="card"><h2>${esc(t("sched_title"))}
      <span class="row"><span class="seg" role="group">${["mwf", "tt", "wkd"].map(k => `<button data-act="sched-tab" data-v="${k}" aria-pressed="${type === k}">${esc(DT(k))}</button>`).join("")}</span>
      <button class="btn small" data-act="sched-edit">${esc(S.editSched ? t("done") : t("edit"))}</button></span></h2>
    <div>${rows || `<p class="sub">${esc(t("no_blocks"))}</p>`}</div>
    ${S.editSched ? `<div class="row" style="margin-top:10px"><button class="btn" data-act="sched-add">${esc(t("add_block"))}</button><span class="sub">${esc(t("sched_tip"))}</span></div>` : ""}
  </section>
  <section class="card"><h2>${esc(t("habits_title"))} <button class="btn small" data-act="habit-edit">${esc(S.editHabits ? t("done") : t("edit"))}</button></h2>
    <p class="sub" style="margin-top:0">${esc(t("habits_tip"))}</p>
    <div>${hs.map(h => S.editHabits ? `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">
        <input id="hl-${esc(h.id)}" data-habit-label="${esc(h.id)}" value="${esc(L(h))}" style="flex:1 1 200px" aria-label="${esc(t("habit_name"))}">
        <span class="seg">${["mwf", "tt", "wkd"].map(k => `<button data-act="habit-day" data-id="${esc(h.id)}" data-v="${k}" aria-pressed="${(h.days || []).includes(k)}">${esc(DT(k))}</button>`).join("")}</span>
        <button class="btn small danger" data-act="habit-del" data-id="${esc(h.id)}">${esc(t("del"))}</button></div>`
      : `<div class="hrow"><span>${esc(L(h))}${h.auto === "focus" ? ` <span class="auto" title="${esc(t("auto_focus"))}">${esc(store.settings.focusGoal)}′ auto</span>` : ""}</span>
        <span class="daychips">${["mwf", "tt", "wkd"].map(k => `<span class="${(h.days || []).includes(k) ? "on" : ""}">${esc(DT(k))}</span>`).join("")}</span>
        <span class="streak">${streak(h) > 0 ? esc(t("streak", streak(h))) : ""}</span></div>`).join("")}</div>
    ${S.editHabits ? `<button class="btn" data-act="habit-add" style="margin-top:10px">${esc(t("add_habit"))}</button>` : ""}
  </section>`;
}

/* ================= roadmap ================= */
function vLearn() {
  const rm = store.roadmap, start = parseYmd(rm.start || ymd(mondayOf(today0()))), td = today0();
  const all = rm.weeks.flatMap(w => w.items), dn = all.filter(i => i.done).length, TR = { main: t("rm_main"), side: t("rm_side"), int: t("rm_int") };
  return `${syncBanner()}
  <section class="card"><h2>${esc(t("rm_title"))} <span class="count">${dn}/${all.length}</span></h2>
    <div class="meter" aria-hidden="true"><i style="width:${all.length ? Math.round(dn / all.length * 100) : 0}%"></i></div>
    <div class="row" style="margin-top:12px">
      <span class="track main">${esc(TR.main)}</span><span class="sub">${esc(t("rm_main_d"))}</span>
      <span class="track side">${esc(TR.side)}</span><span class="sub">${esc(t("rm_side_d"))}</span>
      <span class="track int">${esc(TR.int)}</span><span class="sub">${esc(t("rm_int_d"))}</span>
      <span class="spacer"></span><button class="btn small" data-act="rm-edit">${esc(S.editRm ? t("done") : t("rm_edit"))}</button></div>
    ${S.editRm ? `<label class="f" style="margin-top:10px;max-width:220px">${esc(t("rm_start"))}<input type="date" id="rmStart" data-rm-start="1" value="${esc(rm.start)}"></label>` : ""}
  </section>
  ${rm.weeks.map((w, wi) => { const ws = addDays(start, wi * 7), we = addDays(ws, 6), cur = td >= ws && td <= we, d = w.items.filter(i => i.done).length;
    return `<section class="card week${cur ? " wk-cur" : ""}"><h3>${esc(t("rm_week", wi + 1))} <span class="rng">${md(ws)}–${md(we)}</span>${cur ? `<span class="pill copper">${esc(t("rm_this"))}</span>` : ""}<span class="spacer"></span><span class="count">${d}/${w.items.length}</span>
      ${S.editRm && rm.weeks.length > 1 ? `<button class="btn small danger" data-act="rm-delweek" data-w="${wi}">${esc(t("rm_delweek"))}</button>` : ""}</h3>
      <div class="checks">${w.items.map((it, ii) => `<div class="task"><button class="check" id="rm-${esc(it.id)}" data-act="rm-toggle" data-w="${wi}" data-i="${ii}" aria-pressed="${!!it.done}"><span class="box">${CHECK}</span><span class="track ${esc(it.track)}">${esc(TR[it.track] || "")}</span><span class="txt">${esc(L(it))}</span></button>${S.editRm ? `<button class="btn small danger" data-act="rm-del" data-w="${wi}" data-i="${ii}">${esc(t("del"))}</button>` : ""}</div>`).join("")}</div>
      ${S.editRm ? `<form class="row" data-form="rm" data-w="${wi}"><select id="rmTrack-${wi}" style="flex:0 0 96px">${Object.entries(TR).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select><input id="rmNew-${wi}" placeholder="${esc(t("rm_new"))}" style="flex:1 1 180px"><button class="btn" type="submit">${esc(t("add"))}</button></form>` : ""}
    </section>`; }).join("")}
  ${S.editRm ? `<button class="btn" data-act="rm-addweek">${esc(t("rm_addweek"))}</button>` : ""}`;
}

/* ================= notes ================= */
function vNotes() {
  const topics = store.settings.topics, td = ymd(today0()), notes = notesList(), TP = k => t("topics")[k] || k;
  const isDue = n => n.kind === "market" && n.reviewDate && n.reviewDate <= td && !n.reviewed;
  let list = notes;
  if (S.noteFilter === "due") list = list.filter(isDue); else if (S.noteFilter !== "all") list = list.filter(n => n.cat === S.noteFilter);
  const comp = S.composerOpen ? `<div style="display:grid;gap:10px">
      <span class="seg" role="group"><button data-act="note-kind" data-v="insight" aria-pressed="${S.noteKind === "insight"}">${esc(t("n_insight"))}</button><button data-act="note-kind" data-v="market" aria-pressed="${S.noteKind === "market"}">${esc(t("n_market"))}</button></span>
      <div class="chips">${topics.map(c => `<button class="chip" data-act="note-cat" data-v="${esc(c)}" aria-pressed="${S.noteCat === c}">${esc(TP(c))}</button>`).join("")}</div>
      <input id="nTitle" placeholder="${esc(t("n_title_ph"))}" maxlength="120">
      <textarea id="nBody" rows="5" placeholder="${esc(t("n_body_ph"))}"></textarea>
      ${S.noteKind === "market" ? `<div class="fgrid"><label class="f">${esc(t("n_call"))}<input id="nCall" placeholder="${esc(t("n_call_ph"))}"></label><label class="f">${esc(t("n_when"))}<input type="date" id="nDate" value="${ymd(addDays(today0(), 28))}"></label></div>` : ""}
      <div class="row"><button class="btn primary" data-act="note-save">${esc(t("n_save"))}</button><button class="btn" data-act="note-close">${esc(t("cancel"))}</button></div></div>`
    : `<div class="row"><button class="btn primary" data-act="note-open">${esc(t("n_new"))}</button><span class="sub">${esc(t("n_tip"))}</span></div>`;
  return `${syncBanner()}
  <section class="card"><h2>${esc(t("n_title"))}</h2>${comp}</section>
  <div class="chips"><button class="chip" data-act="note-filter" data-v="all" aria-pressed="${S.noteFilter === "all"}">${esc(t("n_all"))} ${notes.length}</button>
    ${topics.map(c => `<button class="chip" data-act="note-filter" data-v="${esc(c)}" aria-pressed="${S.noteFilter === c}">${esc(TP(c))}</button>`).join("")}
    <button class="chip" data-act="note-filter" data-v="due" aria-pressed="${S.noteFilter === "due"}">${esc(t("n_due"))} ${notes.filter(isDue).length}</button></div>
  ${list.length ? list.map(n => { const due = isDue(n);
    return `<article class="card note"><div class="hd"><span class="cat">${esc(TP(n.cat))}</span><span class="kind">${esc(n.kind === "market" ? t("n_market") : t("n_insight"))} · ${esc(n.date || "")}</span>${due ? `<span class="tag due">${esc(t("n_due_tag"))}</span>` : ""}${n.reviewed ? `<span class="tag" data-tag="move">${esc(t("n_reviewed"))}</span>` : ""}<span class="spacer"></span>
      <button class="btn small danger" data-act="note-del" data-id="${esc(n.id)}">${esc(S.confirmDel === n.id ? t("n_del2") : t("del"))}</button></div>
      <h3>${esc(n.title || t("n_untitled"))}</h3>${n.body ? `<div class="body">${esc(n.body)}</div>` : ""}
      ${n.kind === "market" ? `<div class="call"><b>${esc(t("n_call_l"))}</b>：${esc(n.call || "—")}<br><span class="sub">${esc(t("n_review_day"))} ${esc(n.reviewDate || t("n_unset"))}</span>${n.outcome ? `<br><b>${esc(t("n_result"))}</b>：${esc(n.outcome)}` : ""}</div>` : ""}
      ${due ? `<div class="row"><input id="out-${esc(n.id)}" placeholder="${esc(t("n_out_ph"))}" style="flex:1 1 220px"><button class="btn" data-act="note-review" data-id="${esc(n.id)}">${esc(t("n_record"))}</button></div>` : ""}
    </article>`; }).join("") : `<div class="empty">${esc(notes.length ? t("n_empty_cat") : t("n_empty"))}</div>`}`;
}

/* ================= review ================= */
const weekDays = () => { const m = parseYmd(S.week); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); };
function dayScore(dstr) { const d = parseYmd(dstr), hs = habitsFor(d); if (!hs.length) return null; if (!store.days[dstr] && !focusList(dstr).length) return null; return hs.filter(h => habitDone(dstr, h)).length / hs.length; }
const sleepVal = tm => { const m = toMin(tm); if (m == null) return null; return m < 12 * 60 ? m + 1440 : m; };
function lineChart(pts, lo, hi, target, ticks, label) {
  const W = 560, H = 150, Lp = 46, Rp = 12, Tp = 10, Bp = 24, pw = W - Lp - Rp, ph = H - Tp - Bp, n = pts.length;
  const x = i => Lp + (n < 2 ? pw / 2 : i * pw / (n - 1)), y = v => Tp + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * ph;
  let g = ticks.map(tk => `<line x1="${Lp}" x2="${W - Rp}" y1="${y(tk)}" y2="${y(tk)}" stroke="var(--line)"/><text x="${Lp - 8}" y="${y(tk) + 4}" text-anchor="end" font-size="11" font-family="var(--f-mono)" fill="var(--muted)">${fmtMin(tk)}</text>`).join("");
  g += `<line x1="${Lp}" x2="${W - Rp}" y1="${y(target)}" y2="${y(target)}" stroke="var(--copper)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${W - Rp}" y="${y(target) - 5}" text-anchor="end" font-size="11" fill="var(--copper)">${esc(t("r_target"))} ${fmtMin(target)}</text>`;
  let path = "", segs = []; pts.forEach((p, i) => { if (p.v == null) { if (path) segs.push(path); path = ""; } else path += (path ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1); }); if (path) segs.push(path);
  g += segs.map(s => `<path d="${s}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`).join("");
  g += pts.map((p, i) => p.v == null ? "" : `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === n - 1 ? 4 : 3}" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"><title>${p.label} ${fmtMin(p.v)}</title></circle>`).join("");
  g += pts.map((p, i) => i % 2 === (n - 1) % 2 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" font-family="var(--f-mono)" fill="var(--muted)">${p.label}</text>` : "").join("");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg></div>`;
}
function weekSummary() {
  return weekDays().map(d => { const k = ymd(d), day = store.days[k], hs = habitsFor(d);
    return { date: k, weekday: T.zh.wd[d.getDay()], type: T.zh["dt_" + dayType(d)], logged: !!day,
      habits_done: hs.filter(h => habitDone(k, h)).map(h => L(h)), habits_missed: hs.filter(h => !habitDone(k, h)).map(h => L(h)),
      wake: day && day.wake || null, slept_last_night: day && day.sleep || null, exercise: day && day.ex && day.ex.type ? day.ex : null,
      focus_minutes: focusMinutes(k), focus_withered: focusList(k).filter(f => f.status !== "done").length,
      spend: day ? Object.assign({ total: spendTotal(day) }, day.spend || {}) : null,
      energy: day && day.energy || null, tasks: day ? (day.tasks || []).map(x => (x.done ? "[完成] " : "[未完成] ") + x.text) : [], note: day && day.note || "" }; });
}
function vReview() {
  const wd = weekDays(), wk = isoWeek(wd[0]), rv = store.reviews[wk] || {}, keys = wd.map(ymd);
  const wakes = keys.map(k => store.days[k] && toMin(store.days[k].wake)).filter(v => v != null);
  const sleeps = keys.map(k => store.days[k] && sleepVal(store.days[k].sleep)).filter(v => v != null);
  const avg = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : null;
  const exN = keys.filter(k => store.days[k] && store.days[k].ex && store.days[k].ex.type).length;
  const sc = keys.map(dayScore).filter(v => v != null);
  const fm = keys.reduce((a, k) => a + focusMinutes(k), 0);
  const spDays = keys.filter(k => store.days[k] && spendTotal(store.days[k]) > 0);
  const spTot = keys.reduce((a, k) => a + spendTotal(store.days[k]), 0);
  const cats = ["b", "l", "d", "o"].map(c => ({ c, v: keys.reduce((a, k) => a + num(((store.days[k] || {}).spend || {})[c]), 0) }));
  const cmax = Math.max(1, ...cats.map(x => x.v));
  const td = today0(), last14 = [...Array(14)].map((_, i) => addDays(td, i - 13));
  const lvl = v => v == null || v === 0 ? 0 : v < .34 ? 1 : v < .67 ? 2 : v < 1 ? 3 : 4;
  const pts = f => last14.map(d => ({ label: md(d), v: f(store.days[ymd(d)]) }));
  const wkp = wk.split("-W");
  return `${syncBanner()}
  <div class="datebar"><button class="btn icon" data-act="wk-prev" aria-label="${esc(t("r_prev"))}">‹</button><span class="d">${esc(t("r_week", wkp[0], +wkp[1]))}</span><span class="pill">${md(wd[0])}–${md(wd[6])}</span><button class="btn icon" data-act="wk-next" aria-label="${esc(t("r_next"))}">›</button>${S.week === ymd(mondayOf(td)) ? "" : `<button class="btn small" data-act="wk-cur">${esc(t("r_cur"))}</button>`}</div>
  <div class="stats">
    <div class="stat"><div class="v">${wakes.length ? fmtMin(avg(wakes)) : "—"}</div><div class="k">${esc(t("r_wake", wakes.length))}</div></div>
    <div class="stat"><div class="v">${sleeps.length ? fmtMin(avg(sleeps)) : "—"}</div><div class="k">${esc(t("r_sleep", sleeps.length))}</div></div>
    <div class="stat"><div class="v">${fm}′</div><div class="k">${esc(t("r_focus"))}</div></div>
    <div class="stat"><div class="v">${exN}<span class="count"> / 7</span></div><div class="k">${esc(t("r_ex"))}</div></div>
    <div class="stat"><div class="v">${sc.length ? Math.round(avg(sc) * 100) + "%" : "—"}</div><div class="k">${esc(t("r_habit"))}</div></div>
    <div class="stat"><div class="v" style="font-size:18px">${money(spTot)}</div><div class="k">${esc(t("r_spend"))}${spDays.length ? " · " + esc(t("r_avg_day")) + " " + money(spTot / spDays.length) : ""}</div></div>
  </div>
  <section class="card"><h2>${esc(t("r_strip"))} <span class="sub" style="font-weight:400">${esc(t("r_darker"))}</span></h2>
    <div class="strip">${last14.map(d => { const v = dayScore(ymd(d)); return `<div class="cell${ymd(d) === ymd(td) ? " today" : ""}" data-l="${lvl(v)}" title="${md(d)} ${v == null ? esc(t("r_unlogged")) : Math.round(v * 100) + "%"}"></div>`; }).join("")}</div>
    <div class="striplab" style="margin-top:4px">${last14.map(d => `<span>${esc(WD(d.getDay())).slice(0, 2)}</span>`).join("")}</div></section>
  <div class="grid2">
    <section class="card"><h2>${esc(t("r_wake_c"))} <span class="sub" style="font-weight:400">${esc(t("r_14"))}</span></h2>${lineChart(pts(x => x ? toMin(x.wake) : null), 360, 720, 480, [360, 480, 600, 720], t("r_wake_c"))}</section>
    <section class="card"><h2>${esc(t("r_sleep_c"))} <span class="sub" style="font-weight:400">${esc(t("r_14"))}</span></h2>${lineChart(pts(x => x ? sleepVal(x.sleep) : null), 1320, 1680, 1410, [1320, 1440, 1560, 1680], t("r_sleep_c"))}</section>
  </div>
  <section class="card"><h2>${esc(t("r_spend_c"))} <b class="count">${money(spTot)}</b></h2>
    <div style="display:grid;gap:8px">${cats.map(x => `<div style="display:grid;grid-template-columns:64px 1fr 96px;gap:10px;align-items:center"><span class="sub">${esc(t("sp_" + x.c))}</span><div class="meter" style="height:10px"><i style="width:${Math.round(x.v / cmax * 100)}%;background:var(--copper)"></i></div><span class="count" style="text-align:right">${money(x.v)}</span></div>`).join("")}</div></section>
  <section class="card"><h2>${esc(t("r_reflect"))}</h2><div style="display:grid;gap:10px">
    <label class="f">${esc(t("r_good"))}<textarea id="rv-good" data-rv="good" rows="2">${esc(rv.good)}</textarea></label>
    <label class="f">${esc(t("r_stuck"))}<textarea id="rv-stuck" data-rv="stuck" rows="2">${esc(rv.stuck)}</textarea></label>
    <label class="f">${esc(t("r_nextw"))}<textarea id="rv-next" data-rv="next" rows="2">${esc(rv.next)}</textarea></label></div></section>
  <section class="card"><h2>${esc(t("r_claude"))}</h2><p class="sub" style="margin-top:0">${esc(t("r_claude_tip"))}</p>
    <button class="btn primary" data-act="copy-week">${esc(t("r_copy"))}</button>${rv.ai ? `<div class="ai" style="margin-top:12px">${esc(rv.ai)}</div>` : ""}</section>`;
}

/* ================= settings ================= */
function vSettings() {
  const st = store.settings, online = navigator.onLine;
  let gcard;
  if (!CLIENT_ID) gcard = `<p>${esc(t("s_noid"))}</p>`;
  else if (!meta.linked) gcard = `<p>${esc(t("s_link_tip", FILE_NAME))}</p><p class="sub">${esc(t("s_scope_tip"))}</p><button class="btn primary" data-act="signin">${esc(t("s_link"))}</button>`;
  else gcard = `<dl class="kv"><dt>${esc(t("s_account"))}</dt><dd>${esc(meta.email || t("s_linked"))}${meta.name ? "（" + esc(meta.name) + "）" : ""}</dd>
      <dt>${esc(t("s_status"))}</dt><dd>${esc(!online ? t("s_offline") : tokenValid() ? (meta.dirty ? t("s_pending") : t("s_synced")) : t("s_expired"))}</dd>
      <dt>${esc(t("s_last"))}</dt><dd>${fmtTime(meta.lastSync)}</dd><dt>${esc(t("s_file"))}</dt><dd>${FILE_NAME}</dd></dl>
      ${meta.syncError === "error" ? `<p class="sub" style="color:var(--bad)">${esc(t("s_syncfail"))}</p>` : ""}${meta.syncError === "denied" ? `<p class="sub" style="color:var(--bad)">${esc(t("s_denied"))}</p>` : ""}
      <div class="row" style="margin-top:12px">${tokenValid() ? `<button class="btn primary" data-act="sync-now">${esc(t("s_sync"))}</button>` : `<button class="btn primary" data-act="signin">${esc(t("s_relink"))}</button>`}<button class="btn danger" data-act="signout">${esc(S.confirmSignOut ? t("s_signout2") : t("s_signout"))}</button></div>`;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const scales = [0.9, 1, 1.12, 1.25];
  return `
  <div class="grid2">
    <section class="card"><h2>${esc(t("s_lang"))}</h2><span class="seg" role="group"><button data-act="lang" data-v="zh" aria-pressed="${LANG === "zh"}">繁體中文</button><button data-act="lang" data-v="en" aria-pressed="${LANG === "en"}">English</button></span></section>
    <section class="card"><h2>${esc(t("s_font"))}</h2><span class="seg" role="group">${scales.map((s, i) => `<button data-act="font" data-v="${s}" aria-pressed="${num(st.fontScale || 1) === s}">${esc(t("s_font_opts")[i])}</button>`).join("")}</span></section>
  </div>
  <section class="card"><h2>${esc(t("s_google"))}</h2>${gcard}</section>
  <section class="card"><h2>${esc(t("s_notify"))}</h2><p class="sub" style="margin-top:0">${esc(t("s_notify_tip"))}</p>
    <label class="switch"><input type="checkbox" id="nfOn" data-notify="enabled"${st.notify.enabled ? " checked" : ""}> ${esc(t("s_notify_on"))}</label>
    <div class="fgrid" style="margin-top:10px"><label class="f">${esc(t("s_morning"))}<input type="time" id="nfM" data-notify="morning" value="${esc(st.notify.morning)}"></label><label class="f">${esc(t("s_evening"))}<input type="time" id="nfE" data-notify="evening" value="${esc(st.notify.evening)}"></label></div>
    <p class="sub" style="margin:10px 0 0">${esc(t("s_notify_soon"))}</p></section>
  <section class="card"><h2>${esc(t("s_focus"))}</h2><div class="fgrid">
    <label class="f">${esc(t("s_goal"))}<input type="number" min="10" max="600" step="5" id="sGoal" data-set="focusGoal" value="${esc(st.focusGoal)}"></label>
    <label class="f">${esc(t("s_grace"))}<input type="number" min="0" max="120" id="sGrace" data-set="focusGrace" value="${esc(st.focusGrace)}"></label></div>
    <label class="switch" style="margin-top:10px"><input type="checkbox" id="sStrict" data-set="focusStrict"${st.focusStrict ? " checked" : ""}> ${esc(t("s_strict"))}</label></section>
  <section class="card"><h2>${esc(t("s_install"))}</h2>${standalone ? `<p>${esc(t("s_installed"))}</p>` : `${S.installEvt ? `<button class="btn primary" data-act="install" style="margin-bottom:10px">${esc(t("s_install_btn"))}</button>` : ""}
    <ol class="steps">${(ios ? t("s_ios") : t("s_android")).map(x => `<li>${esc(x)}</li>`).join("")}</ol><p class="sub">${esc(t("s_install_tip"))}</p>`}</section>
  <section class="card"><h2>${esc(t("s_backup"))}</h2><p class="sub" style="margin-top:0">${esc(t("s_backup_tip"))}</p>
    <div class="row"><button class="btn" data-act="export">${esc(t("s_export"))}</button><label class="btn" for="importFile">${esc(t("s_import"))}</label><input type="file" id="importFile" accept="application/json,.json" hidden></div></section>
  <section class="card"><h2>${esc(t("s_about"))}</h2><dl class="kv"><dt>${esc(t("s_version"))}</dt><dd>2.0（2026-11）</dd><dt>${esc(t("s_local"))}</dt><dd>${esc(t("s_local_v", Object.keys(store.days).length, notesList().length))}</dd></dl></section>`;
}

/* ================= events ================= */
function setPath(obj, path, val) { const p = path.split("."); let o = obj; for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; } o[p[p.length - 1]] = val; }
const findBlock = id => { for (const k of ["mwf", "tt", "wkd"]) { const b = (store.settings.schedule[k] || []).find(x => x.id === id); if (b) return b; } return null; };
function go(v) { S.view = v; try { history.replaceState(null, "", "#" + v); } catch (_) { location.hash = v; } window.scrollTo(0, 0); }
function layMove(id, dir) {
  const lay = store.settings.layout, shown = lay.filter(x => !x.hidden), i = shown.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= shown.length) return;
  const a = lay.indexOf(shown[i]), b = lay.indexOf(shown[j]); [lay[a], lay[b]] = [lay[b], lay[a]]; changeSettings();
}
function addTask(ds, text) { const d = ensureDay(ds); if (d.tasks.length >= 5) return false; d.tasks.push({ id: uid(), text, done: false }); changeDay(ds); return true; }
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a || a.disabled) return;
  const act = a.dataset.act, v = a.dataset.v, id = a.dataset.id, ds = a.dataset.date || S.date;
  const lay = store.settings.layout, li = lay.find(x => x.id === id);
  switch (act) {
    case "nav": go(v); break;
    case "day-prev": S.date = ymd(addDays(parseYmd(S.date), -1)); break;
    case "day-next": S.date = ymd(addDays(parseYmd(S.date), 1)); break;
    case "day-today": S.date = ymd(today0()); break;
    case "habit": { const d = ensureDay(S.date); const h = store.settings.habits.find(x => x.id === id); const cur = h ? habitDone(S.date, h) : !!d.habits[id]; d.habits[id] = !cur; changeDay(S.date); break; }
    case "task": { const d = ensureDay(ds); const x = d.tasks.find(q => q.id === id); if (x) x.done = !x.done; changeDay(ds); break; }
    case "task-del": { const d = ensureDay(ds); d.tasks = d.tasks.filter(q => q.id !== id); changeDay(ds); break; }
    case "energy": { const d = ensureDay(S.date); const n = Number(v); d.energy = d.energy === n ? 0 : n; changeDay(S.date); break; }
    case "lay-edit": S.editLayout = !S.editLayout; break;
    case "lay-up": layMove(id, -1); break;
    case "lay-down": layMove(id, 1); break;
    case "lay-size": if (li) { li.size = li.size === "full" ? "half" : "full"; changeSettings(); } break;
    case "lay-hide": if (li) { li.hidden = true; changeSettings(); } break;
    case "lay-show": if (li) { li.hidden = false; changeSettings(); } break;
    case "lay-reset": store.settings.layout = clone(DEFAULT_LAYOUT); changeSettings(); break;
    case "y-move": { const ys = ymd(addDays(today0(), -1)), yd = ensureDay(ys), x = yd.tasks.find(q => q.id === id); if (x && addTask(ymd(today0()), x.text)) { x.moved = true; changeDay(ys); } else toast(t("task_max")); break; }
    case "f-min": S.fMin = Number(v); break;
    case "f-tag": S.fTag = v; break;
    case "f-start": startFocus(); return;
    case "f-giveup": if (S.fConfirmGiveUp) { S.fConfirmGiveUp = false; finishFocus("dead"); return; } S.fConfirmGiveUp = true; setTimeout(() => { if (S.fConfirmGiveUp) { S.fConfirmGiveUp = false; render(); } }, 4000); break;
    case "say": say(a.dataset.text, a); return;
    case "say-all": { const w = vocabDay(S.vDate).words; if (!ttsOk()) return; speechSynthesis.cancel(); w.forEach(x => { [x[0], x[3]].forEach(tx => { const u = new SpeechSynthesisUtterance(tx); u.lang = "en-US"; u.rate = 0.9; if (enVoice) u.voice = enVoice; speechSynthesis.speak(u); }); }); return; }
    case "v-prev": S.vDate = ymd(addDays(parseYmd(S.vDate), -1)); break;
    case "v-next": S.vDate = ymd(addDays(parseYmd(S.vDate), 1)); break;
    case "v-today": S.vDate = ymd(today0()); break;
    case "v-known": { const w = a.dataset.w; const r = store.vocab[w] = Object.assign({}, store.vocab[w] || {}); r.known = !r.known; touch(r); commit(); break; }
    case "sched-tab": S.schedTab = v; break;
    case "sched-edit": S.editSched = !S.editSched; break;
    case "sched-add": { const k = S.schedTab; store.settings.schedule[k] = store.settings.schedule[k] || []; store.settings.schedule[k].push({ id: "b" + uid(), start: "", end: "", label: t("new_block"), tag: "life" }); changeSettings(); break; }
    case "sched-del": { const k = S.schedTab; store.settings.schedule[k] = store.settings.schedule[k].filter(b => b.id !== id); changeSettings(); break; }
    case "habit-edit": S.editHabits = !S.editHabits; break;
    case "habit-add": store.settings.habits.push({ id: "h" + uid(), label: t("new_habit"), days: ["mwf", "tt"] }); changeSettings(); break;
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
    case "note-del": if (S.confirmDel === id) { S.confirmDel = null; store.notes[id] = { id, deleted: true, updatedAt: Date.now() }; commit(); } else { S.confirmDel = id; setTimeout(() => { if (S.confirmDel === id) { S.confirmDel = null; render(); } }, 4000); } break;
    case "note-review": { const n = store.notes[id], inp = document.getElementById("out-" + id); if (n) { n.outcome = (inp && inp.value.trim()) || ""; n.reviewed = true; touch(n); commit(); } break; }
    case "wk-prev": S.week = ymd(addDays(parseYmd(S.week), -7)); break;
    case "wk-next": S.week = ymd(addDays(parseYmd(S.week), 7)); break;
    case "wk-cur": S.week = ymd(mondayOf(today0())); break;
    case "copy-week": copyWeek(); return;
    case "lang": LANG = v === "en" ? "en" : "zh"; store.settings.lang = LANG; changeSettings(); break;
    case "font": store.settings.fontScale = Number(v); changeSettings(); break;
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
  setTimeout(() => { [["nTitle", "title"], ["nBody", "body"], ["nCall", "call"], ["nDate", "date"]].forEach(([i, k]) => { const el = document.getElementById(i); if (el && draft[k]) el.value = draft[k]; }); }, 0);
}
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  if (f.dataset.form === "task") { const ds = f.dataset.date || S.date, inp = f.querySelector("input"), txt = inp.value.trim(); if (!txt) return; if (!addTask(ds, txt)) { toast(t("task_max")); return; } inp.value = ""; inp.blur(); render(); }
  if (f.dataset.form === "rm") { const w = +f.dataset.w, inp = document.getElementById("rmNew-" + w), tr = document.getElementById("rmTrack-" + w), txt = inp.value.trim(); if (!txt) return; store.roadmap.weeks[w].items.push({ id: "i" + uid(), text: txt, track: tr.value, done: false }); changeRoadmap(); inp.value = ""; inp.blur(); render(); }
});
function onField(e, final) {
  const el = e.target;
  if (el.id === "importFile") { if (final) importData(el); return; }
  if (el.id === "fRange") { S.fMin = Number(el.value); if (final) render(); else { const tm = document.querySelector(".focus-stage .timer"); if (tm) tm.textContent = pad(S.fMin) + ":00"; } return; }
  if (el.dataset.day) {
    const d = ensureDay(S.date); setPath(d, el.dataset.day, el.value); changeDay(S.date);
    if (el.dataset.day.indexOf("spend.") === 0) { const tt = document.getElementById("spTotal"); if (tt) tt.textContent = money(spendTotal(d)); if (final && el.dataset.day === "spend.o") render(); }
  }
  else if (el.dataset.sched) { const b = findBlock(el.dataset.id); if (b) { b[el.dataset.sched] = el.value; changeSettings(); if (final && el.dataset.sched !== "label") render(); } }
  else if (el.dataset.habitLabel) { const h = store.settings.habits.find(x => x.id === el.dataset.habitLabel); if (h) { h.label = el.value; changeSettings(); } }
  else if (el.dataset.rmStart) { store.roadmap.start = el.value; changeRoadmap(); if (final) render(); }
  else if (el.dataset.rv) { const wk = isoWeek(parseYmd(S.week)); const r = store.reviews[wk] = Object.assign({ week: wk }, store.reviews[wk] || {}); r[el.dataset.rv] = el.value; touch(r); commit(); }
  else if (el.dataset.vocab) { const w = el.dataset.vocab; const r = store.vocab[w] = Object.assign({}, store.vocab[w] || {}); r.mine = el.value; touch(r); commit(); }
  else if (el.dataset.notify) { const k = el.dataset.notify; store.settings.notify[k] = el.type === "checkbox" ? el.checked : el.value; changeSettings(); }
  else if (el.dataset.set) { const k = el.dataset.set; store.settings[k] = el.type === "checkbox" ? el.checked : num(el.value); changeSettings(); }
}
document.addEventListener("input", e => { if (e.target.tagName !== "SELECT" && e.target.type !== "file" && e.target.type !== "checkbox") onField(e, false); });
document.addEventListener("change", e => onField(e, true));

function saveNote() {
  const g = id => ((document.getElementById(id) || {}).value || "").trim();
  const title = g("nTitle"), body = g("nBody");
  if (!title && !body) { const el = document.getElementById("nTitle"); if (el) { el.placeholder = t("n_need"); el.focus(); } return; }
  const n = { id: uid(), kind: S.noteKind, cat: S.noteCat, title, body, date: ymd(today0()), createdAt: new Date().toISOString() };
  if (S.noteKind === "market") { n.call = g("nCall"); n.reviewDate = g("nDate"); n.reviewed = false; n.outcome = ""; }
  touch(n); store.notes[n.id] = n; S.composerOpen = false; draft = {}; commit(); render(); toast(t("n_saved"));
}
function copyWeek() {
  const wk = isoWeek(parseYmd(S.week)), rv = store.reviews[wk] || {};
  const data = { week: wk, days: weekSummary(), reflection: { good: rv.good || "", stuck: rv.stuck || "", next: rv.next || "" } };
  const text = "請當我的生活教練，根據以下 The Life 一週紀錄（JSON，logged=false 代表那天沒有紀錄）與我的自我回顧，用繁體中文給我：【本週觀察】2–3 點（引用具體數據）、【最該調整的一件事】1 點、【下週建議】2–3 個具體可執行的小行動。\n\n" + JSON.stringify(data, null, 1);
  const fallback = () => { const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) { } ta.remove(); toast(ok ? t("r_copied") : t("r_copyfail")); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(t("r_copied")), fallback); else fallback();
}
function exportData() {
  const blob = new Blob([JSON.stringify(store, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "the-life-backup-" + ymd(today0()) + ".json";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function importData(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { let j = JSON.parse(r.result); if (!j || typeof j !== "object" || !j.days) throw 0; if (j.app === "Simon Life" || !j.schema || j.schema < 2) j = migrateV1(j); store = merge(store, j); LANG = store.settings.lang === "en" ? "en" : "zh"; commit(); render(); toast(t("s_imported")); } catch (_) { toast(t("s_badfile")); } input.value = ""; };
  r.readAsText(f);
}

/* ================= boot ================= */
const redirectResult = handleRedirect();
const h0 = (location.hash || "").replace("#", ""); if (VIEWS.includes(h0)) S.view = h0;
window.addEventListener("hashchange", () => { const x = (location.hash || "").replace("#", ""); if (VIEWS.includes(x) && x !== S.view) { S.view = x; render(); } });
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installEvt = e; if (S.view === "settings") render(); });
window.addEventListener("online", () => { setSync(); if (tokenValid()) sync(); if (S.view === "settings") render(); });
window.addEventListener("offline", () => { setSync(); if (S.view === "settings") render(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { if (FRUN && !FRUN.hiddenAt) { FRUN.hiddenAt = Date.now(); lsSet(LS.run, FRUN); } if (ttsOk()) speechSynthesis.cancel(); }
  else { if (FRUN) { checkFocus(); if (FRUN) keepAwake(); } if (tokenValid()) sync(); if (S.date !== ymd(today0()) && S.view !== "today") { } render(); }
});
window.addEventListener("pagehide", () => { if (FRUN && !FRUN.hiddenAt) { FRUN.hiddenAt = Date.now(); lsSet(LS.run, FRUN); } });
setInterval(() => { if (document.visibilityState === "visible" && tokenValid() && meta.dirty) sync(); }, 60000);
setInterval(() => { const c = document.getElementById("clock"); if (!c) return; const ni = nowInfo(); if (c.textContent !== ni.clock) { c.textContent = ni.clock; if (/[05]$/.test(ni.clock)) render(); } }, 20000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js").catch(() => { });
if (FRUN) { checkFocus(); if (FRUN) { startTicker(); keepAwake(); } }
render();
if (migrated) toast(t("t_migrated"));
if (redirectResult === "ok") { toast(t("t_linked")); loadProfile().then(() => render()); sync(); }
else if (redirectResult === "error" && meta.syncError === "denied") toast(t("t_denied"));
else if (tokenValid()) sync();
else if (CLIENT_ID && meta.linked && navigator.onLine && redirectResult == null && Date.now() - (meta.lastSilent || 0) > 10 * 60 * 1000) signIn(true);
})();
