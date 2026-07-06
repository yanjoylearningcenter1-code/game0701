# Learning Journey Engine — 讀默／背默／測驗／考試 完整拆解 + App 設計修訂 v3

> 本版本拿走「project stage / MVP phase」嘅框架，回到最基本嘅香港小學學習流程：
> **讀默 → 背默 → 測驗 → 考試**
> 四者唔係四個獨立 Mode，而係同一條 **Memory Consolidation Curve** 上唔同長度、唔同顆粒度嘅版本。本文件將四者各自拆做至少 10 個 Step，包含 forgetting curve 邏輯、最短溫習時間、里程碑準則，然後根據呢套邏輯修訂 App 設計，並新增 Dashboard 設計。

---

# 0. 拿走 Project Stage 框架

原本文件用「Mode 1/2/3/4」+「MVP Priority」呢種產品開發角度分類，容易令人誤會四者係四個平行選項。

**依家改用單一模型：**

```text
每一個 Knowledge Unit（一個字/一句/一個概念）
都有一個 Memory Strength（記憶強度，0-100%）

讀默 = 管理 Word-level Knowledge Unit
背默 = 管理 Sentence/Paragraph-level Knowledge Unit
測驗 = 管理 Concept-level Knowledge Unit + Application
考試 = 管理 Multi-topic Knowledge Unit + Retrieval under pressure
```

四條 track 可以喺同一段時間**並存**（例如呢個星期讀默默書，同時仍在溫緊上個月測驗嘅弱項），唔係順序切換嘅四個 App 畫面。

---

# 1. 真實學校 Timeline 校準

| 類型 | 老師通常提早派範圍 | 建議 App 預設 Journey 長度 |
|---|---|---|
| 讀默 | 1–2 星期 | 7–14 天（最短可壓縮到 3 天） |
| 背默 | 1–2 星期 | 7–14 天 |
| 測驗（Quiz） | 2–4 星期（約 0.5 個月） | 14–28 天 |
| 考試（Exam） | 4–8 星期（約 1–2 個月） | 28–56 天 |

**壓縮規則**：如果老師派範圍嘅時間比建議最短天數仲短（例如聽日就默書），AI 需要將 Step 合併/跳過低優先級 Step（例如跳過 Step 1 認知階段，直接由 Step 3 開始），但**唔應該跳過 Delayed Recall**，因為呢步係驗證是否真係記得住嘅關鍵，寧願減少新內容都要留番做呢步。

---

# 2. 讀默 — 完整 10 Step 拆解

以 20 個英文生字、7 天後默書為例：

| Step | Day | 最短時長 | 目標 | 玩法示例 | 過關準則 |
|---|---|---|---|---|---|
| 1 | Day1 | 5 min | Recognize（第一次接觸） | 睇字／聽讀音／揀正確字 | ≥60% |
| 2 | Day1-2 | 5–8 min | Understand 意思 | 配意思／配圖片／同音字 | ≥70% |
| 3 | Day2-3 | 8 min | 開始串字 | `ele_ _ ant` 補字母 | ≥75% |
| 4 | Day3 | 10 min | 完整串字 | 亂序字母拼返完整 | ≥80% |
| 5 | Day3-4 | 8 min | 第一次 Recall（唔睇答案） | 睇圖片直接 Spell | ≥80% |
| 6 | Day4→Day5（隔24hr） | 5 min | Delayed Recall | 唔提示，直接問 | ≥80%（否則插返 Step 4） |
| 7 | Day5-6 | 8 min | Mixed Review | 新舊字隨機混合（非 ABCDE 順序） | ≥80% |
| 8 | Day6 | 5 min | Fast Recall | 5 秒限時作答 | ≥85% |
| 9 | Day6-7 | 8 min | Mock Dictation | 聽讀音打字，無提示 | ≥85% |
| 10 | Day7（默書前） | 5 min | Ready Check | 全部 20 字抽樣考 | ≥95% → Ready；82-94% → 回 Step 7；<82% → 回 Step 4 |

**溫習方法**：唔係「做一次就過」，而係 Active Recall（主動回想）取代 Passive Review（睇答案）。由 Step 5 開始，每一步都應該係「先答，後知結果」，而唔係「先睇後答」。

---

# 3. 背默 — 完整 10 Step 拆解

單位由 Word 變做 Sentence / Paragraph：

| Step | 時間點 | 最短時長 | 目標 | 玩法示例 | 過關準則 |
|---|---|---|---|---|---|
| 1 | Day1 | 8 min | 閱讀＋理解 | 朗讀／解釋大意 | ≥60% |
| 2 | Day1-2 | 8 min | Highlight Keyword | 揀出關鍵字/主題句 | ≥70% |
| 3 | Day2-3 | 8 min | Missing Word | 填空缺字 | ≥75% |
| 4 | Day3-4 | 10 min | Sentence Ordering | 句子重組排序 | ≥75% |
| 5 | Day4-5 | 10 min | Sentence Recall | 唔睇原文，默返一句 | ≥80% |
| 6 | Day5-6 | 12 min | Paragraph Recall | 默返一段（可分段給提示） | ≥80% |
| 7 | Day6→Day7（隔24hr） | 8 min | Delayed Recall #1 | 24hr 後再默 | ≥85% |
| 8 | Day7→Day9（隔48hr） | 8 min | Delayed Recall #2 | 48hr 後再默 | ≥85% |
| 9 | Day9→Day12（隔72hr） | 8 min | Delayed Recall #3 | 72hr 後再默 | ≥88% |
| 10 | 默書前一日 | 10 min | Full Dictation（全文默） | 完整默出全段，計錯字率 | ≥90% → Ready；否則回 Step 6 |

---

# 4. 測驗（Quiz）— 完整 10+ Step 拆解

原文件只寫到 Week1-4 高層次流程，依家拆到 Step 級（以 3 週後 Quiz、涵蓋 3-5 個 Concept 為例）：

| Step | 時間點 | 最短時長 | 目標（Bloom's-like） | 玩法示例 | 過關準則 |
|---|---|---|---|---|---|
| 1 | Week1 Day1-2 | 10 min | Know（概念認知） | 閱讀＋Highlight 重點 | ≥60% |
| 2 | Week1 Day3-4 | 10 min | Understand（配對） | Key Term Matching | ≥70% |
| 3 | Week1 Day5-6 | 10 min | Understand（例子辨識） | 圖表/例子標籤 | ≥70% |
| 4 | Week2 Day1 | 10 min | Apply（基礎 MC） | Multiple Choice（易） | ≥75% |
| 5 | Week2 Day2-3 | 12 min | Apply（混合 MC） | MC 混合新舊 concept（Mixed Review） | ≥75% |
| 6 | Week2 Day4-5 | 12 min | Apply（情境題） | Scenario-based Questions | ≥80% |
| 7 | Week3 Day1 | 10 min | Weak Topic Drill | AI 揀出 Memory Strength 最低嘅 unit 集中操練 | ≥80% |
| 8 | Week3 Day2-3 | 12 min | Timed Round | 限時 MC | ≥85% |
| 9 | Week3 Day4 | 15 min | Mock Quiz（全套，無提示） | 完整模擬卷 | ≥85% |
| 10 | Week3 Day5→Day7（隔48-72hr） | 10 min | Delayed Recall Check | 再測一次 Mock 題目 | ≥85% |
| 11 | Quiz 前 | 10 min | Ready Check | 抽樣全部 concept | ≥90% → Ready；<90% → 回 Step 7 |

---

# 5. 考試（Exam）— 完整 10+ Step 拆解

以 8 週後考試、涵蓋多個 topic/多科為例：

| Step | 時間點 | 最短時長 | 目標 | 玩法示例 | 過關準則 |
|---|---|---|---|---|---|
| 1 | Week1-2 | 每日15min | Learn（逐個 topic 過一次讀默/背默/Quiz 級 Journey） | 沿用 Section 2-4 嘅內部 Journey | 各 topic ≥75% |
| 2 | Week3 | 15min | First Review（單科內跨 topic 回顧） | Mixed Recall（同科不同單元隨機） | ≥80% |
| 3 | Week4 | 15min | Mixed Subject Review | 跨科目交替（避免單科疲勞） | ≥80% |
| 4 | Week5 Day1 | 10min | Weak Topic Diagnostic | AI 掃描全部 unit，列出 Memory Strength 最低清單 | 產出弱項清單，非過關制 |
| 5 | Week5 Day2-5 | 15min | Weak Topic Intensive Drill | 針對弱項用 Section 2-4 玩法加強 | 弱項 ≥80% |
| 6 | Week6 | 15min | Second Mixed + Timed Review | 全科限時混合 | ≥85% |
| 7 | Week7 Day1-3 | 20-30min | Past Paper Practice #1（不限時） | 完整past paper | 記錄錯題，非硬性過關 |
| 8 | Week7 Day4-5 | 15min | Past Paper Error Review | 針對錯題逐題重做+相關 unit 補溫 | 錯題 unit ≥85% |
| 9 | Week8 Day1-3 | 30-45min | Past Paper Practice #2（考試條件限時） | 完整模擬考試環境 | ≥85% |
| 10 | Week8 Day4-6 | 15min | Final Weak Point Sweep | 針對剩低嘅低 Memory Strength unit 最後衝刺 | ≥90% |
| 11 | 考試前1-2日 | 10min | Confidence Ready Check | 全科抽樣＋顯示 Readiness Report | 顯示總體 % 俾家長/小朋友參考，非強制過關 |

---

# 6. Forgetting Curve 引擎（通用邏輯，適用所有四條 track）

## 6.1 唔用固定 Day1/Day3/Day7

原文件已經指出重點：唔應該死板咁話「第1日、第3日、第7日」，而係每個 Knowledge Unit 有自己嘅 **Memory Strength**，由 AI 每日更新，跌到某個門檻先觸發溫習。

```text
Memory Strength(unit, t) = f(last_score, days_since_last_review, review_count, unit_difficulty)

範例（簡化 SM-2 概念）：
- 首次評分 95% → 預測 24hr 後跌到 80%
- 首次評分 60% → 預測 24hr 後跌到 40%（跌得快，需要更快再溫）

觸發規則：
若 predicted_strength(今日) < review_threshold（例如 70%）
→ 該 unit 排入「今日待溫習」queue
```

呢個取代咗原本「Day1/Day3/Day7 世界主題」嘅寫死排程，變成**動態排程**。

## 6.2 過關準則（唔係一次全對）

| 學習階段 | 建議過關準則 | 原因 |
|---|---|---|
| 第一次接觸 | 60–70% | 建立熟悉感，避免挫敗 |
| 理解/重組 | 75–80% | 開始形成穩定記憶 |
| 第一次 Recall | 80–85% | 能夠主動提取資訊 |
| Delayed Recall（24–72hr） | ≥85% | 驗證是否真正記住 |
| Mock Dictation / Quiz | ≥90% | 接近真實考核要求 |
| Ready for Exam | ≥95%（容許少量錯誤） | 達到高信心狀態 |

## 6.3 真正嘅停止條件

**唔係**：「今次全部啱」
**而係**：「隔一段時間仍然可以答啱」——即係 retention 喺遞增嘅時間間隔下都保持穩定。

```text
範例：
第一次：95%
24小時後：93%
3天後：91%

→ 知識已相對穩定，可以暫停呢個 unit，
   下次複習排喺較長間隔（例如 7-14 天後）先再問。
```

如果數值反而下跌（例如 95% → 60% → 40%），代表 unit 未穩固，需要縮短複習間隔，插返去較早期嘅 Step。

## 6.4 最短時長原則（跨四條 track 共通）

* 單一 Step 建議最短 **5 分鐘**（低於此難以形成有效練習）
* 單日單一 track 建議總時長 **5–15 分鐘**（貼近 Section 18 KPI 嘅 session duration 目標）
* 如果小朋友同時有多條 track（讀默+測驗溫習同時進行），AI 需要喺總時長內按優先級（Delayed Recall 到期 > 新內容）分配時間，唔應該逐條 track 各自加 15 分鐘導致總負荷過高

---

# 7. 根據以上邏輯，App 設計需要修訂嘅地方

## 7.1 移除「幾時考試？」單一問題（原 Step 4）

原本 Onboarding 流程用一條問題（幾時考試？14/7/3/1天）決定 world-state，依家唔夠用，因為：
- 讀默/背默/測驗/考試四條 track 可以同時存在，各自時長唔同
- 一個小朋友可能同時有「聽日默書」+「兩個月後考試」兩件事

**修訂做法**：

```text
派功課／範圍（由老師或家長輸入，唔係小朋友自己首次體驗要答）
↓
選類型：讀默 / 背默 / 測驗 / 考試
↓
選/確認範圍到期日（系統按 Section 1 表格自動建議預設日期，可覆蓋）
↓
AI 自動生成該 track 嘅 Learning Journey（Section 2-5 嘅 Step 序列）
```

小朋友首次體驗（Kid 自己影一張工作紙嚟玩）**依然可以完全跳過呢步**，直接用「Quick Battle」模式即玩即完（呢個保留原本 30 秒爽感嘅設計），唔綁定去任何 track 嘅 deadline。只有「老師/家長指派」嘅功課先會綁定完整 Journey。

## 7.2 AI Daily Task Engine（新增核心系統）

取代原本淨係睇「仲有幾多日」嚟決定 world 難度嘅做法，改為：

```text
每日登入 App：
1. 掃描小朋友所有 active Knowledge Unit（跨全部 track）
2. 計算每個 unit 嘅 predicted Memory Strength
3. 揀出「今日到期溫習」+「今日新內容」兩類 unit
4. 按 Section 6.4 嘅時長上限（5-15min/track）組成今日任務隊列
5. 渲染做 battle（沿用原本 5 個 Interaction System）
```

## 7.3 Gameplay System 對應更新

| Step 類型 | 對應原有 System |
|---|---|
| Recognize / MC / 配對 | System 1（Tap Answer） |
| 補字母 / 句子重組 / Missing Word | System 2（Drag Reconstruction） |
| Delayed Recall / Mixed Review | System 3（Memory Flash） |
| Error Review（Past Paper 錯題） | System 4（Error Detection） |
| Mock Dictation / Full Dictation | **新增 System 5-Lite（打字輸入）** |

**關於 System 5**：原文件因為 handwriting AI 太難而完全排除。但 Mock Dictation／Full Dictation 呢類 Step 需要「唔提供選項、要主動輸出」嘅能力先夠真實。修訂建議：**唔做手寫筆劃辨識**，改用**鍵盤打字輸入 + 文字比對**（技術風險遠低於 handwriting stroke recognition），滿足呢個需求，同時保持原本「唔做手寫」嘅風險控制原則。

## 7.4 「世界主題」邏輯調整

原本 world-state（glowing runes / boss 等）由「仲有幾多日」決定。依家改為由 **該 track 嘅整體 Readiness %**（Section 6 嘅 aggregate memory strength）決定視覺主題，日子仍然係輸入之一，但唔係唯一決定因素：

```text
Readiness < 60% → calm world, easy enemies
Readiness 60-80% → danger rising
Readiness 80-90% → storm effects, boss evolution
Readiness ≥90% → final trial, ultimate boss
```

呢個令個世界更貼合「小朋友實際準備成度」，而唔淨係「日子過咗幾多」。

---

# 8. 新增：Dashboard 設計

## 8.1 Kid Dashboard（喺原 Kid Home Hub 基礎上擴充）

```text
TOP
🧒 Avatar ｜ ⚡ Energy ｜ 🔥 Streak ｜ 🏆 Rank

MIDDLE（新增）
🧠 記憶力總覽（每個 active track 一個進度環：讀默 82% / 背默 65% / 測驗 40%）
⏰ 今日待溫習（顯示今日 Queue 內有幾多個 unit 到期，例如「3個字要溫」）
👾 今日 Boss（沿用，連結去 Readiness% 決定嘅世界主題）

BOTTOM
📸 新增教材（永遠 visible，沿用原設計）
```

## 8.2 Parent Dashboard（擴充原本 Section 9）

```text
TOP
👋 Chris 今日完成 2/3 任務
📋 進行中嘅 Track 列表：

  類型      範圍        到期日      Readiness   弱項
  讀默      20個生字     7/8(五)     82%         apple, giraffe
  背默      第3段        7/12(二)    65%         -
  測驗      Chapter 4-5  7/25       40%         photosynthesis

MIDDLE
📸 上傳教材（指派新功課，含 Section 7.1 嘅類型+範圍+日期設定表單）
⚔ 發送挑戰

BOTTOM
📈 學習進度（可展開睇返 Section 2-5 嘅 Step-level 完成情況）
🧠 AI 建議（例如：「apple 呢個字連續2次 Delayed Recall 都跌，建議今晚加開一次溫習」）
⚙ 設定（內含數據使用說明，沿用 v2 修訂）
```

## 8.3 Teacher Dashboard（比原文件「淨係 room code」更完整）

原文件 Teacher Flow 太簡陋（只有 upload + share room code），依家配合 Learning Journey 補充：

```text
TOP
📊 全班 Readiness 熱力圖（X軸：學生，Y軸：Knowledge Unit/Topic，格仔顏色代表 Memory Strength）

MIDDLE
📅 派範圍（設定表單）
  類型：讀默/背默/測驗/考試
  範圍：（貼上/影相教材）
  到期日：（系統按 Section 1 建議，可覆蓋）
  → 一鍵推送俾全班／指定 room code 學生

⚠ 全班共同弱項（AI 自動歸納邊幾個 unit 全班 Memory Strength 普遍偏低，提示老師可能要課堂再教）

BOTTOM
👥 學生名單（每人顯示 Readiness % + 完成進度）
🔗 Room Code 管理（沿用 v2 修訂嘅 room_id/teacher_id/joined_students 資料模型）
```

**注意**：熱力圖同全班弱項歸納涉及較複雜嘅後端運算（跨學生聚合 Memory Strength），建議喺 Kid+Parent 嘅 core loop 驗證得住 daily retention 之後先做，避免分散開發資源（沿用 v2 對 Teacher Flow 建議留到 Phase 2 嘅立場，但依家 Dashboard 設計已經預留位置）。

---

# 9. 資料模型新增（支援以上設計）

```text
knowledge_unit
  unit_id
  type (word / sentence / concept / topic)
  track_type (讀默 / 背默 / 測驗 / 考試)
  content
  memory_strength (0-100, 每日更新)
  last_reviewed_at
  review_count
  current_step (對應 Section 2-5 嘅 Step編號)
  next_due_at (由 forgetting curve model 計算)

learning_track
  track_id
  student_id
  type (讀默 / 背默 / 測驗 / 考試)
  scope_description
  assigned_by (teacher_id / parent_id / self)
  start_date
  due_date
  readiness_percent (aggregate from knowledge_unit)

daily_task_queue
  student_id
  date
  unit_ids[] (今日到期 + 今日新內容)
  total_duration_estimate
```

---

# 10. 遲用 App / 臨急抱佛腳（今日先用，聽日就默）

前面 Section 2-5 嘅設計全部假設「有足夠日子做完整 Journey」。但現實係：唔少家長/學生會遲先開 app，甚至「今日先派範圍，聽日就默」。呢種情況唔可以當做例外唔理，而係要有獨立設計，因為：

* 呢類用戶可能正正係最需要 app 幫手嘅一群（平時無溫習習慣）
* 如果 app 淨係識做「10 Step × 7 日」，遲用嘅人會覺得「唔啱用」，第一印象差，直接影響 D7 Retention（Section 18 KPI）

## 10.1 自動偵測：Lead Time 唔夠點算

```text
lead_time = due_date - 今日

如果 lead_time < Section 1 建議最短天數
→ 系統自動將呢條 track 標記為 is_cram = true
→ 套用「Cram Journey Template」，而唔係 Section 2-5 嘅標準 Template
```

Cram Template 唔係「plan B 就求求其其」，而係用返教育心理學入面專門應付短時間嘅技巧：

* **Expanding Retrieval（擴展式提取練習）**：唔可能隔 24hr 先問，但可以喺同一個 session 入面，用「唔同 chunk 交替」製造人工間隔（做緊 B 組嘅時候，A 組被迫要停一停先再問），效果好過死記或者一路睇一路讀
* **Triage（先篩選，唔平均分配時間）**：先快速測試邊啲已經識，將時間集中喺唔識嘅部分，唔好由頭到尾平均咁做晒 10 Step
* **善用瞓覺嘅 Consolidation 效應**：如果 lead time 跨咗一晚（例如今晚溫，聽朝默），瞓前嘅一次快速複習 + 聽朝嘅 refresh，比起淨係今晚一次過操到晚仍然更有效，因為記憶鞏固好一部分喺瞓眠期間發生

## 10.2 Emergency 讀默 Journey（lead time ≤ 1 日）

以 20 個生字、今晚溫聽朝默為例：

| Step | 時間點 | 時長 | 內容 | 原理 |
|---|---|---|---|---|
| E1 | 開始 | 3 min | Quick Diagnostic：全部20字快速測一次（唔提示） | Triage——已識嘅字直接標記「已掌握」，唔再花時間 |
| E2 | 之後 | 8 min | Chunk A（未識嘅字，5個一組）多感官學習：睇字+聽讀音+初步串字 | 建立初步印象 |
| E3 | 之後 | 8 min | Chunk B（下一組5個）學習，**同時**穿插 Chunk A 嘅快閃提取 | Expanding Retrieval：做緊 B 嘅時候被迫回想返 A |
| E4 | 之後 | 8 min | Chunk C/D（如有）學習，穿插 A+B 嘅快閃提取 | 同上，間隔越拉越開 |
| E5 | 學習後15-20min | 8 min | 全部字 Mixed Recall（隨機次序） | 第一次完整提取 |
| E6 | 之後 | 5 min | Fast Recall（限時） | 模擬默書壓力 |
| E7 | 瞓前（如時間許可） | 5 min | 快速 top-up：只溫返 E5 答錯嘅字 | 善用瞓眠鞏固記憶 |
| E8 | 聽朝／默書前 | 5 min | Morning Refresh：全部字最後過一次 | 減少隔夜遺忘落差 |
| E9 | 默書後1-2日 | 5 min | **強制排入 Follow-up 溫習**（見 10.4） | 臨急記嘅嘢唔穩固，如果呢批字之後仲會用到（例如串字會再考），需要事後鞏固先變長期記憶 |

**同 Section 2 標準 Journey 嘅分別**：Emergency 版本冇 24/48/72hr 嘅 Delayed Recall（時間唔夠），改用 session 內部嘅間隔提取（E3-E5）盡量模擬效果；亦都誠實咁降低咗對「長期記住」嘅承諾，改為集中應付「聽日默書過到關」呢個即時目標，並將長期鞏固責任交俾 10.4 嘅 Follow-up。

## 10.3 Emergency 測驗/考試 Journey（lead time 少過建議天數）

唔可能跑晒 Section 4/5 嘅完整 Know→Understand→Apply→Mixed→Timed 序列，改用 **Triage-first** 策略：

| Step | 內容 | 原理 |
|---|---|---|
| T1 | 快速 Diagnostic Quiz（全部 topic 各出1-2題） | 揪出邊啲 topic 已經識、邊啲完全唔識 |
| T2 | 按「唔識程度 × 該 topic 喺卷嘅比重」排優先次序 | 有限時間優先投放喺 CP 值最高嘅弱項 |
| T3 | 弱項：直接跳去 Apply 級（做題＋即時睇解釋），唔使由 Know 慢慢鋪 | Retrieval Practice（直接做題）被證實喺時間有限時比重新睇書更有效率 |
| T4 | 已識嘅 topic：只做少量 Timed 題確認未跌 memory，唔重複學 | 避免浪費時間喺已經識嘅嘢 |
| T5 | 如果仲有少少時間：Past Paper 節錄（揀最高頻題型） | 提升應試熟悉度 |
| T6 | 考試/測驗後：自動排 Follow-up（同 10.4） | 弱項好可能考完都仲係弱項，尤其考試內容通常會喺下一階段再用到 |

## 10.4 Follow-up Reinforcement（臨急溫完之後點做）

臨急抱佛腳最大問題唔係「今次過唔過到關」，而係**呢批知識好快會跌返落嚟**，如果之後嘅內容建立喺呢個基礎上（例如生字之後作文要用、topic 之後考試會再考），冇跟進就會不斷惡性循環。

```text
規則：
凡係 is_cram = true 嘅 track，完成 deadline（默書/測驗/考試）之後，
系統自動喺 1-2 日後排一次「Consolidation Follow-up」，
只需 5 分鐘，快速重測一次，
如果表現仍然低（<70%），將呢批 unit 重新標記做「長期弱項」，
併入之後相關 track（例如下次測驗）嘅 Weak Topic Drill（Section 4 Step 7 / Section 5 Step 5）。
```

## 10.5 UX / Dashboard 調整

**Kid 端**：Cram Track 用唔同主題包裝（例如「緊急任務／特訓營」），保持遊戲感，但唔扮到好似同正常 Journey 一樣充裕淡定——用「限時特訓」嘅刺激感嚟代替「悠閒冒險」，動機唔同但一樣有 engagement。

**Parent/Teacher Dashboard**：新增標記

```text
📋 Track 列表（沿用 Section 8.2）新增一欄：

  類型   範圍       到期日    Readiness   狀態
  讀默   20個生字    7/8(五)   58%         ⚠ 臨急模式（開始至到期僅1日）
```

⚠ 標記唔係用嚟責怪，而係俾家長/老師知道「呢次 readiness 分數本身可信度較低，因為時間唔夠」，並喺完成之後自動提示 Follow-up 已排定，唔需要家長自己記得。

**行為洞察（軟性，唔對小朋友顯示）**：如果同一個家長/學生嘅 track 有相當比例（例如過去5次有3次或以上）都係 is_cram = true，Parent Dashboard 嘅「AI 建議」可以出現一次性提示，例如：

```text
🧠 AI 建議：過去5次功課有3次都係到期前一日先開始溫習，
   如果方便，下次派到範圍嗰陣早3日提提小朋友開始，
   會令記憶更穩固，亦減少臨急壓力。
```

呢個提示**只出現喺 Parent/Teacher 端**，唔對小朋友顯示，避免對小朋友造成「你成日唔溫書」嘅負面標籤或者壓力。

## 10.6 資料模型新增

喺 Section 9 嘅基礎上加：

```text
learning_track（新增欄位）
  is_cram (boolean, 由 lead_time 自動計算)
  lead_time_days (實際俾嘅溫習日數)

follow_up_task（新增表）
  unit_ids[]
  scheduled_date（deadline後1-2日自動生成）
  status (pending / done / escalated_to_weak_topic)
```

---

# 11. 連 Emergency 都嚟唔切——Survival / SOS Mode（得返1-2粒鐘）

Section 10 嘅 Emergency Journey（E1-E9）都需要約 40-50 分鐘（仲未計瞓覺鞏固）。如果 lead_time 淨係得 1-2 個鐘,甚至更短,連 E1-E9 都做唔晒。呢種情況需要第三層設計,原則同 Emergency 完全唔同：**由「盡量記住」變做「盡量止蝕」**。

## 11.1 觸發同心態轉換

```text
if lead_time < 估計完成 E1-E9 所需時間
→ 切換去 Survival Mode

目標由：
  「令 Memory Strength 升到 90%」
變做：
  「有限時間入面,盡量幫小朋友喺最多題目度攞到分」
```

呢個唔係托詞減料,而係誠實面對現實——教育心理學嘅 spacing/interleaving 需要時間跨度先有效,1-2 粒鐘唔夠條件做,再點包裝都做唔到「長期記住」,不如將呢個限制講清楚,將心機放喺真正做得到嘅嘢。

## 11.2 Time-Budget Triage（先算數,先講清楚做唔晒）

```text
item_budget = 可用分鐘數 ÷ 每個item最低有效時間（讀默約1.5-2min/字)

如果 item_budget < 總item數量：
→ 唔平均攤薄去溫晒全部,而係老實話俾小朋友/家長知：
   「得返 45 分鐘,淨係夠時間主攻 8 個最緊要嘅字,
     其餘 12 個會標記做『默書後即刻補救』」
```

優先排序邏輯（邊8個先做）：
1. 如果係 returning user,有歷史 memory_strength 記錄 → 揀返最低分嗰批
2. 如果係第一次用（冇歷史數據）→ 揀字型較長/串法較複雜嗰批（假設較難）,或者跟老師派嘅次序
3. 家長/小朋友都可以手動剔走已經肯定識嘅字,進一步縮窄範圍

## 11.3 Survival Loop（單一循環,冇分開幾個 Step）

```text
S1 — 極速自評（1min）：全部item 一次過話俾AI知邊啲識/唔識（自己揀,唔使正式測）
S2 — 系統話俾你知：得幾多時間,主攻邊幾個
S3 — Rapid Loop（每個主攻item重複2-3次）：
     睇3秒 → 遮 → 憑記憶答 → 即刻睇啱唔啱 → 錯就即刻再嚟多次
     （呢度冇 spacing,係 massed practice,換取即時表現)
S4 — 最後一次 Full Round：將主攻嗰批全部混合再問一次,模擬默書
S5 — 完咗之後(默書/測驗後)：自動、主動 push 一個 Follow-up 提示
     （唔係被動排喺 queue 度等,因為 Survival Mode 嘅記憶跌得特別快,
       愈快提醒愈好,建議默書後 24 小時內就要補）
```

## 11.4 語氣同心理照顧

呢個情境小朋友/家長好可能已經好緊張。UI 語氣要：

* **唔強調「遲咗」**——唔好出現「你剩返好少時間」呢類令人更加焦慮嘅字眼,改用「SOS特訓」「衝刺任務」等偏遊戲化、行動導向嘅框架
* **唔用「你今次考唔到滿分」呢類預警**——只需要清楚話「我哋主攻呢幾個,盡力啦」
* **完成之後(唔理表現點),都要有正面收尾**（例如「已經盡咗力喇,今晚早啲瞓,幫個腦鞏固返啱啱記嘅嘢」）——呼應瞓眠鞏固記憶嘅原理,同時避免小朋友因為時間不足而自責

## 11.5 對 Parent/Teacher 嘅標記

```text
📋 Track列表新增狀態：

  類型   範圍       到期日      Readiness   狀態
  讀默   20個生字   今晚8點      35%         🆘 極限模式（少於2小時）
```

備註文字（俾家長睇）：「受時間所限,今次只覆蓋咗8/20個字,建議默書後盡快安排一次完整鞏固,並考慮下次提早開始。」——事實陳述,唔用責怪語氣。

---

# 12. 學生自己自覺想溫書（自己 Upload,冇老師/家長派）

原本 Section 7.1 將「派功課」同「小朋友自己影嚟玩」分開,但冇講清楚：如果係小朋友自己主動、有心機想溫書（唔係得個玩字）,自己上載教材,整套系統點處理。呢個係好正面嘅訊號,唔應該用返「Quick Battle 玩完即棄」嗰套,亦都唔應該逼佢答返一堆好似老師派功課咁嘅表格。

## 12.1 Self-Initiated Track 設計

```text
Kid Home Hub → 📸新增教材（隨時可以撳,唔止首次)
↓
上載完之後,AI分析內容,問（可跳過,唔強制）：
  「呢個係咩？」
  [老師派嘅功課]  [我自己想溫]  [唔知/隨便㩒]
↓
如果揀「我自己想溫」：
  → 建立 track_type = self_practice
  → 冇 due_date（或者輕輕問「有冇話幾時考？」,答唔到就留空)
  → 唔套用 Cram/Emergency/Survival 邏輯（因為冇死線壓力）
  → 直接併入 AI Daily Task Engine,用標準 Forgetting Curve 排程
    （即係同 Section 6 一樣有 Memory Strength 追蹤,
      但唔會因為「臨近deadline」而催谷佢）
```

## 12.2 Priority 分配（同時有 assigned track 點算）

如果小朋友同時有「老師派嘅讀默」（有死線）同「自己想溫」（冇死線）,AI Daily Task Engine 排今日任務時：

```text
優先次序：
1. 有死線 track 嘅到期 Delayed Recall（唔可以錯過,一錯過個間隔就浪費咗）
2. 有死線 track 嘅新內容
3. self_practice track（用剩低嘅時間額度補上,唔會迫爆今日時長上限）
```

咁樣可以保護「有壓力嗰啲」優先完成,但又唔會完全冇時間理會小朋友自發嘅興趣。

## 12.3 對 Parent Dashboard 嘅呈現

self_practice track 建議喺 Parent Dashboard 用**正面框架**顯示,唔好淨係當普通功課列出：

```text
✨ Chris 今日自己上傳咗教材溫習（自發!）
   內容：XX
   已溫緊,暫時未設考試日期
```

呢個係一個值得俾家長睇到、鼓勵嘅訊號,唔需要特別隱藏。

---

# 13. 多角色 App 入口設計（Kid / Parent / Teacher 點樣喺同一個 App 共存）

原本設計淨係諗咗「小朋友首次體驗」呢一條路,冇處理「同一部手機/iPad,可能爸媽同小朋友都會用」,或者「點樣防止小朋友撞入 Parent/Teacher 專屬畫面」。

## 13.1 核心原則

```text
Kid Mode  = 預設、零登入、零角色揀選、隨時可玩（原本 Step1 嘅承諾繼續生效）
Parent/Teacher Mode = 獨立入口,需要輕量驗證,先可以睇到分析內容
```

**唔喺開 app 一刻就問「你係邊個？」**——呢個會違反原本「dopamine within 30秒」同「唔准 role selection」嘅規則。取而代之,用業界慣常做法（同 YouTube Kids / 好多兒童 App 一樣）：**「家長專區」用一個輕量關卡（Parental Gate）擋住,唔用強行喺入口問身份**。

## 13.2 首次開啟流程（單一裝置,未有任何帳號）

```text
App Icon 撳落去
↓
Hero Landing（📸拍教材 ⚔即刻變成挑戰）— 冇任何角色問題
↓
[開始體驗] → 直接玩（Guest Kid Mode）
```

畫面右上角有一個細細嘅、唔顯眼嘅連結：「👨‍👩‍👧 家長 / 老師專區」

## 13.3 「家長/老師專區」入口機制（Parental Gate）

撳入去唔係直接見到分析內容,而係需要通過一個簡單關卡,先進入：

```text
方式1（冇帳號）：簡單數學題關卡（例如「7 × 8 = ?」）
              — 小朋友（尤其低年級）唔容易亂咁撞入
方式2（已有帳號）：Email/電話登入
              — 呢個係之前 Step8 Soft Persistence 或者
                另外喺 Parent Dashboard 建立帳號時已經設定
方式3（已設定 PIN）：4位數 PIN
```

入到「家長/老師專區」之後,先揀返：

```text
👨‍👩‍👧 家長 Dashboard  |  🏫 老師 Dashboard
```

（如果個帳號同時連結咗屋企同班房,兩邊都會出現;一般家長帳號淨會見到「家長」嗰邊)

## 13.4 Teacher 使用情境略有唔同

老師通常唔會同學生共用裝置,所以 Teacher 入口可以簡化為**獨立登入**（email 帳號,可以喺網頁版/自己部手機用）,唔太需要 Parental Gate 呢層,但後端權限模型（Section 14）一樣要生效。

## 13.5 已登入之後嘅角色切換（Multi-Kid 家庭）

如果一個家長帳號連結咗多個小朋友（例如兩兄妹）,Parent Dashboard 頂部要有簡單嘅小朋友切換器：

```text
[Chris 👦] [Amy 👧]  ← 撳邊個就睇邊個嘅 track/readiness
```

而小朋友個 Kid Mode 本身**唔需要揀「我係邊個」**——如果裝置係共用,建議用返 Section 13.3 相似機制,喺 Kid Home Hub 加一個好細嘅頭像撳一撳就切換（唔設密碼,因為 Kid 之間互相睇對方遊戲進度風險低）,但呢個切換器**唔會出現去 Parent/Teacher 分析內容**嘅入口。

---

# 14. 權限同資料可見度模型（Student 唔可以睇到 Parent/Teacher 嘅分析）

呢個唔淨係 UI 隱藏咁簡單,要喺資料層面（後端 API）強制執行,先至可靠。

## 14.1 核心原則

```text
小朋友可以睇到：自己嘅遊戲化進度（Streak/Rank/Boss/Combo/「精靈力量」）
小朋友唔可以睇到：
  - 逐個 Knowledge Unit 嘅原始 Memory Strength 數字
  - 「弱項清單」呢種明文標籤（尤其寫住邊科邊個concept弱）
  - AI對佢學習模式嘅分析/rationale（例如「佢比較少去嘅時段」「佢成日臨尾至開始」）
  - 其他小朋友（同班同學）嘅數據
```

**原因**：直接俾小朋友睇到「你邊科弱」「你成日臨急先做」呢類明文評語,對小朋友（尤其呢個 App 本身鎖定 SEN/學習差異嘅小朋友)嚟講,容易造成標籤化同自我否定,同 Section 14（原SEN Strategy）「the game understands me,而唔係 the app judges me」呢個核心理念直接衝突。

## 14.2 同一份數據,兩種呈現方式

| 資料 | Kid端呈現 | Parent/Teacher端呈現 |
|---|---|---|
| Memory Strength 82% | 🧠 精靈力量條(視覺化,冇寫實際%數) | 讀默 82%（連 unit 級明細) |
| 弱項 unit list | 融入返落 Boss 戰入面（「今日Boss特別想挑戰你嘅 apple / giraffe」,遊戲化包裝,唔講明呢個係弱項） | 明文列出：apple, giraffe（含建議跟進方法） |
| Cram/Survival 標記 | 只換主題（緊急任務風格）,唔講「你遲咗」 | ⚠/🆘 狀態標籤 + 客觀原因說明 |
| AI行為洞察（例如常臨急先開始) | 完全唔出現 | 只喺 Parent/Teacher 端,一次性、非責怪語氣提示 |

## 14.3 權限資料模型

```text
user_account
  user_id
  role (kid / parent / teacher)
  auth_method (kid: 免登入/輕量頭像切換;parent/teacher: email/PIN)

family_link
  parent_id
  kid_id
  permission_level (view_full_analysis / manage_tracks)

classroom_link
  teacher_id
  kid_id
  room_id

access_control（後端強制,唔淨靠前端UI隱藏）
  kid_token   → 只可以 call 「自己」嘅 gamified 端點,拎唔到 raw memory_strength/rationale
  parent_token → 可以 call 已連結 kid 嘅 raw 分析端點
  teacher_token → 可以 call 已連結 classroom 嘅 raw 分析端點（唔可以睇其他班）
```

**技術上嘅重點**：即使小朋友用返部裝置嘗試直接攞 API（理論上嘅風險）,後端都要按 kid_token 嘅權限範圍拒絕俾 raw rationale/analysis 數據,唔可以淨係靠「前端唔顯示」嚟保護。

---

# 15. 技術現實檢查與商業化前置條件（現況核實，7月新增）

> 以下四點係核實現有 codebase（`hero-learning-3.preview.emergentagent.com`）之後發現嘅落地缺口。呢啲唔係產品功能構思，係**上架、監利化、同法律合規嘅硬性前置條件**——即係話，Section 0-14 嘅設計就算做到100%完美，冇解決以下四點，App 一樣上唔到架、收唔到錢、亦唔可以合法賣數據。

## 15.1 現有前端 = 網站，唔係原生 App；上架三條路點揀

**現況：** 前端係 Create-React-App（craco + Tailwind），部署喺 `hero-learning-3.preview.emergentagent.com`（Emergent 自己嘅 preview domain）。呢個係瀏覽器網站，唔係原生 App。想上 App Store / Play Store，現實得三條路：

| 方案 | 開發成本 | 風險 |
|---|---|---|
| **Capacitor / PWA 包裝**（保留成套 React code，加一層原生殼） | 低——最貼近「0開發成本」目標 | Apple 對「淨係包個網站」嘅 App 審查嚴（Guideline 4.2），尤其你哋主打小朋友，仲要過埋 **Kids Category** 額外要求；OCR 相機權限、離線行為要做好先過到審查 |
| **React Native 重寫** | 高 | 唔啱你依家嘅資源／時間 |
| **純網頁 + 「加到主畫面」**（唔上架） | 0 | 完全唔算「上咗 App Store」，冇曝光；你想要嘅「用完自己分享」病毒式擴散會弱好多，因為冇 App Store 呢個天然嘅可信度＋搜尋入口 |

**建議：** Capacitor/PWA 包裝係三條路入面最貼近現有資源嘅選擇，但要預留時間專門處理 Kids Category 嘅相機權限、離線行為呢類審查重點，唔可以當係簡單打包就算。

**同埋要處理：** 而家個 OAuth 登入係接住 **Emergent 自己嘅 demo backend**——呢個係開發用嘅 proxy，唔可能帶落 production App Store 版（審查會過唔到，Emergent 落閘你就死埋）。**上架之前一定要換做自己擁有嘅 auth**（Firebase Auth / Supabase Auth 呢類，成本都好低）。

## 15.2 想做「政府／醫療研究合作」數據生意——而家完全冇合規地基

搵晒成個 codebase，`consent` / `privacy` / `COPPA` / `parental` 呢啲字**一個都冇出現過**。呢個唔係細節，係成盤生意最大嘅風險：

- 用戶主力係小學生（未成年）——收集佢哋嘅學習行為數據，喺美國要跟 **COPPA**（收集13歲以下數據前必須要家長明確同意）、喺歐盟/英國要跟 **GDPR-K / Age Appropriate Design Code**、喺香港要跟 **PDPO**
- Apple 對 **Kids Category** 嘅 App 有額外規矩：唔准第三方分析/廣告 SDK 隨便收數據、唔准冇同意就外連
- 如果終極目標係將數據賣/授權俾政府或醫療研究機構，門檻仲要再高一層——通常要 **IRB-level 嘅去識別化（de-identification）**、數據治理政策、審計軌跡。呢啲而家完全未起步

**呢個先係真正嘅護城河（moat），唔係個 game loop**：`knowledge_unit` / `memory_strength` 呢啲縱向學習數據，本身先係「其他人唔可以簡單用 AI complicate 你成個 App」嘅答案——AI 好易抄到「影相變遊戲」，但抄唔到你手上囤積咗幾年、幾十萬個小朋友嘅逐字逐句 forgetting curve 數據。**但依家連最基本嘅「攞呢啲數據要點同意、點保存、點去識別化」都未做**，呢層做唔好，唔單止合作唔成，仲有法律風險。

## 15.3 監利化：Apple/Google 對「App 內訂閱」有強制規則

想做 premium/月費訂閱，喺 iOS 度**必須用 Apple In-App Purchase**（抽成15-30%），**唔可以**直接用 Stripe collect 錢再解鎖功能——呢個好多初創唔知，成日俾拒審。

學校 B2B 呢邊反而可以繞過（B2B 合約可以喺 App 外面簽，用返 Stripe/銀行轉帳），但而家個 Teacher Dashboard 淨係得「開room code」，**冇 seat management/帳單/報表**，賣唔到俾學校做採購。

## 15.4 病毒式擴散：而家個 product 冇任何「用完會想分享」嘅 hook

Room code 呢個機制本身係好嘢（老師分享俾成班），但：
- **Kid 端**冇「打贏Boss 攞張靚卡分享去 WhatsApp/IG」
- **Parent 端**冇「邀請朋友」呢類輕量 loop

想達到「唔使咩服務側推廣」，即係要將病毒係數做入產品本身，而家呢層係 **0**。

---

## 15.5 Section 15 對 Section 0-14 設計嘅實際影響（優先順序建議）

| 優先級 | 動作 | 對應現況缺口 |
|---|---|---|
| 🔴 最高 | 換走 Emergent demo backend 嘅 OAuth，改用自己嘅 Firebase/Supabase Auth | 15.1——冇呢步，其他都上唔到架 |
| 🔴 最高 | 加入基本 consent flow（家長同意收集小朋友數據）+ 隱私政策頁 | 15.2——法律風險，唔做隨時要落架 |
| 🟡 中 | Capacitor 包裝 + 針對 Kids Category 審查重點（相機權限、離線） | 15.1 |
| 🟡 中 | Kid 端「Boss卡分享」+ Parent 端「邀請朋友」share hook（沿用 Section 8.1 Kid Dashboard 基礎加） | 15.4，同埋回應之前討論嘅病毒分享機制 |
| 🟢 之後（有用戶量先做） | Apple IAP 整合（消費者訂閱）；Teacher Dashboard 加 seat management（B2B走Stripe） | 15.3 |
| 🟢 之後（數據量夠大先做） | IRB-level de-identification pipeline、數據治理政策 | 15.2 進階部分，等真係有政府/研究合作機會先做到呢層 |

---

# 附錄：本版本（v3）相對 v2 嘅主要改動總覽

| # | 改動 | 原因 |
|---|---|---|
| 1 | 拿走「Mode 1-4 / MVP Priority」框架 | 四者本質係同一條 Memory Consolidation Curve，唔係四個平行產品選項 |
| 2 | 讀默/背默/測驗/考試 各自拆到 10+ Step，含最短時長、玩法、過關% | 原文件只有讀默/背默有 10 Step，測驗/考試仍係高層次描述 |
| 3 | 引入動態 Forgetting Curve（Memory Strength 每日更新），取代固定 Day1/3/7 | 教育心理學重視 stability 而非單次全對 |
| 4 | 移除首次體驗嘅「幾時考試？」單一問題，改由老師/家長喺派功課時分別設定四種類型嘅範圍+日期 | 解決 v2 已發現嘅 onboarding 衝突，同時支援多條 track 並存 |
| 5 | 新增 AI Daily Task Engine，按 Memory Strength 動態排今日任務，唔淨係靠日子倒數 | 令溫習真正貼合遺忘曲線，而非機械式排程 |
| 6 | 新增 System 5-Lite（打字輸入，非手寫辨識）支援 Mock/Full Dictation | 原 System 5 完全排除會令默書類 Step 無法做到「主動輸出」 |
| 7 | 世界主題改由 Readiness % 決定，日子只係輸入之一 | 更貼合「小朋友實際準備成度」而非單純日子流逝 |
| 8 | 新增 Kid/Parent/Teacher 三份 Dashboard 設計 + 對應資料模型 | 回應用戶要求，並將抽象嘅 Memory Strength 概念視覺化俾三種使用者睇 |
| 9 | 新增 Section 10：遲用 App / 臨急抱佛腳（is_cram）獨立設計，包含 Emergency Journey Template、Triage 策略、Follow-up Reinforcement | 唔少家長/學生會遲先開 app 甚至「今日先派範圍聽日就默」，唔可以當例外，否則第一印象差直接影響 D7 Retention |
| 10 | 新增 Section 11：Survival/SOS Mode（lead time少過1-2小時），用 Time-Budget Triage + Rapid Loop，誠實縮窄範圍並主動推 Follow-up | 連 Emergency Template 都嚟唔切嘅極端情況需要獨立心態（止蝕而非追求記住），並要顧及小朋友情緒 |
| 11 | 新增 Section 12：學生自發 Upload 嘅 Self-Initiated Track（冇死線，標準Forgetting Curve排程，優先序低過有死線嘅track） | 原設計冇處理小朋友自己想溫書呢個正面情境，唔應該用 Quick Battle 玩完即棄，亦唔應該逼佢答老師派功課式表格 |
| 12 | 新增 Section 13：多角色 App 入口設計，Kid Mode 免登入 + Parent/Teacher Parental Gate 入口 | 解決同一裝置俾唔同角色用嘅衝突，同時保持原本「Kid 首次體驗零障礙」承諾 |
| 13 | 新增 Section 14：權限同資料可見度模型，後端強制 Kid Token 攞唔到 raw 分析/rationale | 小朋友唔應該睇到明文「弱項」「行為評語」，否則會標籤化同傷害自尊，同 SEN Strategy 核心理念衝突 |
| 14 | 新增 Section 15：技術現實檢查與商業化前置條件（前端上架路徑、demo backend OAuth風險、COPPA/GDPR-K/PDPO合規缺口、Apple IAP強制規則、病毒分享hook缺口） | 核實現有 codebase 之後發現，Section 0-14 嘅產品設計就算完美，冇解決呢四點一樣上唔到架、收唔到錢、合法唔到——呢層先係目前最急需處理嘅現實缺口 |
