# 補充規格書 v1.0 — FamilyLink 家庭連結機制 + 讀默／背默定義修正
## 對應 Learning Journey Engine v3 Section 2 / 3 / 7.3 / 12 / 13.5

> Superseded in part by `FAMILYLINK_AMENDMENT_v1.1.md` — see that file for the
> current Section A.5 (invitation initiator rules) and new Section A.6
> (monitoring disclosure, legally required). Sections A.1–A.4, B, and C below
> are unchanged and still current.

---

# A. FamilyLink（家長連結小朋友）— 沿用 room_code 邏輯，唔起新架構

## A.1 核心判斷

Teacher→Classroom 已經有一套行得通嘅機制：小朋友透過 room code 加入班房，**全程唔使登入**。Family 呢邊唔使發明新嘢，直接複用同一個 pattern。

## A.2 資料模型

```text
kid_device
  kid_device_id (uuid，App首次啟動時生成，存喺裝置本地持久化storage
                 例如 AsyncStorage/localStorage，唔綁email，Guest Mode已隱含存在，
                 依家要求：呢個ID要由「臨時」變做「持久」，跨session保留)
  display_name (optional，小朋友可以自己改暱稱)
  created_at

family_code
  code (6位數字，由 kid_device_id 生成，複用 room_code 嘅生成邏輯)
  kid_device_id
  regenerable (boolean，容許重新產生新code，例如換裝置時)

family_link（Section 14.3 已有雛形，依家補完整）
  link_id
  parent_id
  kid_device_id
  linked_at
  permission_level (view_full_analysis / manage_tracks)
```

**設計為 many-to-many**：一個 kid_device 理論上可以連結多過一個 parent_id（例如分開居住嘅父母都要睇），一個 parent_id 都可以連結多個 kid_device（多子女家庭）。

## A.3 完整流程

```text
1. 小朋友App首次啟動
   → 生成 kid_device_id，寫入本地持久化storage（唔係session-only）

2. 小朋友入返 Section 13.3 嘅 Parental Gate（家長/老師專區）
   → 過咗關卡之後，畫面顯示：「Family Code：482913」
     （UI參考已有嘅 room_code 顯示畫面，唔使新設計一套）

3. 家長喺自己個 Parent Dashboard，撳「連結小朋友」
   → 輸入呢個6位數code
   → 後端建立 family_link(parent_id, kid_device_id)

4. 之後家長開一條新 track（Section 7.1 派功課流程）：
   → student_id 呢個欄位直接寫入已連結嘅 kid_device_id
     （唔再係「家長自己個account」，呢個係修正 Cursor 報告
       第4點嘅根本原因）

5. 小朋友端已有嘅 daily_queue fetch（Cursor確認backend已有endpoint）：
   → 只需要確保查詢條件係「WHERE student_id = 自己嘅kid_device_id」
   → 咁樣家長派嘅track、小朋友自己self_practice嘅track，
     全部都會自然出現喺同一個queue入面，唔使分開兩套UI
```

## A.4 Edge Cases（要喺spec入面預先講清楚，唔留俾Cursor臨時決定）

| 情況 | 處理方式 |
|---|---|
| 小朋友換裝置/重裝App，kid_device_id 遺失 | 視為新裝置，需要重新用code連結。家長端要有清晰提示「小朋友換咗手機？重新連結」，同時舊裝置嘅historical data可以喺後端保留（用返舊kid_device_id），家長Dashboard可以見到「未連結裝置嘅舊紀錄」，避免數據直接消失 |
| Family Code 保安 | 6位數字 + 唔顯示畀陌生人（要過Parental Gate先見到），呢個安全級別同room_code一致，屬合理範圍 |
| 一個小朋友有多個家長帳號 | family_link 設計已支援 many-to-many，唔需要額外處理 |

## A.5 （原版，已被 v1.1 修訂 — 見 AMENDMENT 文件）

~~連結呢個動作嘅發起人預設應該係「家長」，唔係「小朋友」~~ — v1.1 撤銷咗呢個假設，改為容許雙方發起但守三條防線。原文保留喺呢度作歷史記錄，實際規格請睇 v1.1 嘅 A.5（修訂版）。

---

# B. 讀默——真實定義修正（影響 Section 2 + 7.3）

## B.1 你講嘅真實流程 vs 文件原本假設

老師派10個生字，小朋友要背晒全部10個；默書當日，老師隨機讀出當中大約8個（唔係全部10個，亦唔跟原本次序），小朋友要憑聽到嘅讀音，寫返（1）個音 (2) 個樣 (3) 點寫（筆順）。

呢個同 Section 2 原本假設有兩個關鍵落差：

1. **原本 Step 10「Ready Check」寫住「全部20字抽樣考」**——依家要修正做**隨機抽起數量少過總數（大約80%），次序打亂**，先貼近真實默書格式，唔係考晒全部。
2. **原本設計主要靠「睇字/睇圖」做提示**，但真正默書嘅刺激源頭係**聲音**，唔係文字或圖片。由 Step 5 開始，提示方式必須以**播放讀音**為主。

## B.2 對 Section 2 Step Table 嘅具體修正

| Step | 原設計 | 修正 |
|---|---|---|
| 1-4（Recognize/Understand/串字） | 睇字/圖 | 維持——呢幾步係建立印象階段，睇字冇問題 |
| 5（第一次Recall） | 「睇圖片直接Spell」 | 改為**播放讀音，唔顯示文字/圖片，要求打字/寫出正確字** |
| 6（Delayed Recall） | 「唔提示，直接問」 | 明確：**淨播音**，冇任何視覺提示 |
| 7（Mixed Review） | 新舊字隨機混合 | 維持隨機，但提示方式都要係播音 |
| 8（Fast Recall） | 限時作答 | 播音 + 限時 |
| 9（Mock Dictation） | 「聽讀音打字，無提示」 | 已經啱，維持 |
| 10（Ready Check） | 「全部20字抽樣考」 | **改為：隨機抽起約80%，次序打亂，逐個播音，要求寫出答案** |

## B.3 對 System 5-Lite（7.3）嘅補充——關於「點寫（筆順）」

```text
現有決定（保留）：
  評分/過關機制 = 打字輸入 + 文字比對（唔做手寫辨識，技術風險可控）

新增（教學用途，唔評分）：
  喺 Step 1-4（學習階段，非測驗階段）加入「筆順動畫示範」
  （純播放/展示，唔要求小朋友手寫、唔做AI評分）
```

---

# C. 背默——定義確認（Section 3，冇重大衝突，小修辭）

```text
確認：背默嘅「過關」判斷,必須以「完整還原成篇」為終極標準，
      唔可以用「淨係默中間幾句就當過關」代替。

Step 1-9 可以繼續用分段/拆句方式教學（教學手段，唔係最終要求），
但 Step 10 Ready Check 一定要係「一次過默哂成個指定範圍」。
```

---

# D. 總結 instruction（v1.0 部分，項目 1-7；項目 8-13 見 v1.1 amendment）

```
1. 將 kid_device_id 由臨時/session-level 改做持久化本地儲存，
   並喺 Parental Gate 之後顯示 Family Code（複用 room_code 生成邏輯）。
2. Parent Dashboard 新增「連結小朋友」入口，輸入6位Family Code，
   建立 family_link(parent_id, kid_device_id)（many-to-many）。
3. 家長派功課時，track 嘅 student_id 一律寫入已連結嘅 kid_device_id。
4. Kid端 daily_queue fetch 查詢條件確認係
   「WHERE student_id = 自己個kid_device_id」。
5. 讀默 Step 5-10 嘅提示方式改為「播放讀音，唔顯示文字/圖片提示」，
   Step 10 Ready Check 改為「隨機抽起約80%題目，次序打亂」。
6. Step 1-4（學習階段）加入唔評分嘅筆順動畫展示（教學用途）。
7. 背默 Step 10 Ready Check 確認判斷邏輯係「完整還原成篇」。
```

---

*補充規格書 v1.0 — 2026年7月*
