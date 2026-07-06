# 補充規格書 v1.1 — FamilyLink 邀請機制修正 + 監控提示新增規則
## Amendment to 補充規格書 v1.0（只修改 Section A.5，新增 Section A.6；Section B/C 讀默背默定義不變，維持v1.0原文）
## 可直接貼俾 Cursor

---

# 為咩要出 v1.1

v1.0 嘅 Section A.5 假設「連結發起人必須係家長，小朋友一律唔可以主動邀請」，呢個係一個**產品心理學上正確、但法律上過度保守**嘅假設。查證過 COPPA（2025年修訂版，2026年4月22日已生效）同 UK ICO Age Appropriate Design Code（Children's Code）之後：

* **小朋友主動邀請家長本身唔違法**——COPPA §312.5 明文豁免：小朋友可以喺未攞到家長同意之前提供「家長聯絡方式」，前提係唯一目的係觸發 consent request（即係業界講嘅 "Email Plus" 機制）。
* 但**唔理邊個發起**，都必須符合兩條硬性規則，v1.0冇處理第二條，而家一併補齊。

v1.1 唔係推翻 v1.0，而係將 A.5 由「一刀切禁止小朋友發起」，修正做「容許發起，但守住三條防線」，並新增 A.6 補一個之前完全冇處理嘅法定要求。

---

# A.5（修訂版）—— 邀請可以由家長或小朋友發起，但守住三條硬性防線

## A.5.1 廢除嘅假設

~~連結呢個動作嘅發起人預設應該係「家長」，唔係「小朋友」~~ ——呢句喺 v1.0 係核心原則，v1.1 撤銷呢個「發起人身份」限制。真正嘅法律紅線唔喺「邊個撳掣」，而喺下面三條：

## A.5.2 三條硬性防線（唔理邊個發起，一律適用）

### 防線一：入口必須中性，唔可以遊戲化

```text
【絕對唔准】（沿用v1.0原文，不變）：
  - Kid Home Hub 唔可以將「連結家長」設計成任務/成就/徽章/彈窗式CTA
  - 唔可以用 push notification / Boss對話 / Streak提示 主動催促小朋友分享code
  - 唔可以將「已連結家長」設計成有獎勵/解鎖內容/額外Streak保護

【新增,取代v1.0嘅「完全唔存在」原則】：
  - 如果要提供「小朋友主動邀請」呢個入口，只可以放喺一個中性、
    工具性嘅位置——例如 Settings/設定頁入面一個普通選項
    「連結家長帳戶」，同「音量設定」「語言設定」用同一種
    視覺權重，唔可以用鮮艷顏色、動畫、徽章、紅點提示嚟突出佢
  - 唔可以主動彈出、唔可以喺onboarding流程強制經過、
    唔可以用「未連結」狀態顯示任何負面/缺失感嘅視覺提示
    （例如灰色鎖頭、「未完成」紅點）——保持同其他設定選項
    完全一致嘅中性狀態

原因（法律層面）：UK ICO Children's Code Standard 13 明文禁止
"nudge techniques" 引導小朋友交出資料或者降低私隱保護——用遊戲化
誘因推小朋友撳邀請，即使方向係「增加家長監督」而非「減少私隱」，
都會被視為同一類操縱式設計（EU DSA Article 25 對 dark pattern
嘅定義一樣涵蓋呢種「非自願、被設計誘導」嘅互動）。中性放置先
符合「小朋友嘅選擇必須係真正自願」呢個原則。
```

### 防線二：小朋友撳「邀請」唔等於連結生效——一定要家長獨立確認

```text
新增規格（呢個係之前backend已經起好嘅consent機制，
          而家要求「小朋友發起」入口都必須用返同一套，
          唔可以另起一條捷徑）：

小朋友喺Settings撳「連結家長帳戶」
  → 畫面要求輸入：家長email（唔係任何家長帳戶密碼/登入資訊）
  → 呼叫 POST /family-links/invite { kid_device_id, parent_email }
    （呢個係新endpoint，公開、唔需要小朋友登入，
      因為Guest Mode本身冇帳戶）
  → 後端建立一個 pending 狀態嘅 family_link
    + 一個 pending 狀態嘅 consent_record(consent_type="data_collection")
  → 觸發 _send_consent_email()（沿用之前已建嘅stub，
    呢度必須確保正式環境已經接返真email provider，
    唔可以淨係log）
  → 小朋友畫面顯示：「已經send咗俾你阿爸/阿媽，
    等佢哋check email確認」——唔顯示任何「等緊/未回覆」
    嘅催促式UI，一次性顯示完就返回正常畫面

家長個邊：
  → 收到email，撳個link → GET /consent/confirm?token=...
    （沿用現有endpoint，唔使新建）
  → 呢一步先至將 family_link 由 pending 變 active，
    consent_record 由 granted=false 變 granted=true

【絕對唔准】：
  - 小朋友喺App入面自己扮家長撳「確認」——family_link/consent_record
    嘅granted狀態，一律只可以經由emailed token confirm嚟改變，
    後端要拒絕任何試圖繞過token直接set granted=true嘅request
  - 邀請send咗出去之後，小朋友端唔可以睇到「家長已讀/未讀」
    「家長幾時會確認」呢類追蹤資訊——呢個本身都係一種監控壓力，
    同A.5.1嘅中性原則相違背
```

### 防線三：唔可以用「未連結」狀態向小朋友施壓（沿用v1.0，明確保留）

```text
沿用v1.0原文，不變：
  - self_practice track 喺完全冇family_link情況下，
    必須持續使用Forgetting Curve追蹤，唔可以功能閹割
  - 唔可以有「你屋企人仲未連結你」呢類提示語
  - 如果家長想連結一個唔配合嘅小朋友，屬於家庭內部溝通，
    App唔應該幫手施壓
```

## A.5.3 同 Teacher room code 嘅分野（沿用v1.0，唔變）

Teacher連結繼續由老師發起、小朋友被動加入，呢個唔受A.5影響——因為「攞功課」同「監控表現」性質唔同，唔存在被監控嘅心理負擔，唔需要套用上述三條防線。

---

# A.6（新增）—— 監控提示（UK ICO Children's Code Standard 11 / UK GDPR Article 25(1)）

## A.6.1 法律背景

英國 ICO 嘅 Age Appropriate Design Code Standard 11 規定：**如果服務容許家長/監護人monitor小朋友嘅活動，必須俾小朋友一個「obvious sign」，話俾佢知而家係俾人監察緊**。呢條由 2025年6月19號起經 Data (Use and Access) Act 寫入 UK GDPR Article 25(1)，**由建議守則升級做binding law**。呢條code對UK以外嘅公司都適用，只要service「likely to be accessed by」UK嘅小朋友。

**呢個要求同邊個發起連結完全冇關係**——只要family_link處於active狀態（唔理係family發起定小朋友發起），都必須顯示。呢層係v1.0完全冇處理嘅缺口。

## A.6.2 UI 規格

```text
觸發條件：
  小朋友嘅kid_device_id 存在 ≥1 個 status="active" 嘅 family_link

顯示位置：Kid Home Hub 頂部（同Streak/Level等狀態icon同一列），
          長駐顯示，唔可以隱藏、唔可以只顯示一次就消失

視覺設計：
  一個細細嘅圖示，例如 👨‍👩‍👧（同A.5.2防線一原則一致，
  唔用警示色/紅色/驚嘆號等會引起焦慮嘅視覺語言，
  用中性、資訊性嘅呈現方式）

撳落去嘅內容（age-appropriate資訊，Standard 11同時要求）：
  簡短、小朋友睇得明嘅解釋，例如：
  「爸爸/媽媽而家可以睇到你嘅學習進度同表現」
  唔顯示邊個具體家長帳戶、唔顯示家長實際睇過幾多次
  （避免額外監控感），純粹確認「呢個狀態存在」

如果有多個family_link（例如爸爸媽媽分開連結咗）：
  icon保持單一，撳落去嘅解釋文字可以講「屋企有2位大人
  可以睇到你嘅進度」，唔需要逐個列出身份
```

## A.6.3 資料模型

```text
唔需要新增collection——直接查詢現有family_links表，
確認status="active"即可決定顯示與否。

如果想更精確（例如小朋友想知邊個family_link對應緊邊個
permission_level），可以喺GET /home-status（已有endpoint）
加一個欄位：

  family_link_count: int  # active family_link數量
  # 刻意唔返回parent_id/email等識別資訊俾kid端，
  # 避免kid_token攞到唔應該攞嘅家長個人資料（Section 14原則）
```

---

# D.（修訂）—— 補充俾 Cursor 嘅 instruction（取代v1.0原本第5項起相關部分，其餘不變）

```
v1.0原有instruction第1-4項、第5-7項（讀默/背默相關）維持不變，
只係新增/修改以下幾項：

8. Settings頁新增一個中性樣式嘅「連結家長帳戶」選項（同其他設定
   選項同等視覺權重，唔用徽章/紅點/動畫突出），撳落去要求輸入
   家長email，呼叫新endpoint POST /family-links/invite。

9. 新增 POST /family-links/invite endpoint：
   輸入 { kid_device_id, parent_email }
   建立 pending family_link + pending consent_record，
   觸發 _send_consent_email()（沿用已有stub，正式環境前
   必須接返真實email provider）。

10. 明確後端規則：family_link.status 同 consent_record.granted
    一律只可以經由 GET /consent/confirm?token= 呢條路徑改變，
    禁止任何其他endpoint可以直接set呢兩個欄位做true/active。

11. GET /home-status 新增 family_link_count 欄位
    （只返回數量，唔返回parent識別資訊）。

12. Kid Home Hub 頂部新增監控提示icon（👨‍👩‍👧），
    當 family_link_count > 0 時長駐顯示，撳落去顯示
    age-appropriate嘅簡短解釋文字（規格見A.6.2）。

13. 小朋友端UI一律唔顯示「家長已讀/未讀邀請」「家長幾時確認」
    呢類追蹤狀態，邀請send出之後只顯示一次性確認訊息。
```

---

*補充規格書 v1.1 — 2026年7月*
*Amendment to 補充規格書 v1.0；對應主文件 Learning Journey Engine v3 Section 13.3/13.5/14；同時對應 ROADMAP.md Phase 2 consent機制*
