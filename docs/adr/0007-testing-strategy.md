# ADR-0007: 測試策略 — 風險導向的分層測試（獎盃模型）

- **狀態**：Accepted
- **日期**：2026-06-08
- **相關**：planning doc §13.4（本 ADR 為其權威細化）、§13.6 業餘節奏、§4 報酬計算、§6 schema；先於 Sprint 3（ADR-0004 event sourcing）落地

## Context

planning doc §13.4 刻意對 mobile / UI 測試從輕（理由：solo dev UI 測試 ROI 低），單元測試重點放純函式 + Firestore rules。實際演進下來，隱性紀律變成「**只有純函式被測**」：`packages/shared`（money / enums / schemas）與 mobile 的純函式（authErrors / accountOrdering）有測、rules 有 emulator 測試，但 **mobile 的 service / store / screen 完全沒測**，且 rules 與 mobile 測試**都不在 CI**（只本機手動跑）。

使用者明確希望測試能「驗證整個產品效果」，比 §13.4 更積極。但「更積極」不等於「測更多」——對一個**投資組合追蹤 App**，最危險的失敗模式是**安靜的錯誤**：畫面跑得正常、但平均成本算錯、持倉股數少算、精度被 native float 吃掉，拿去跟券商對帳才爆。這種 bug 不 crash、手動點不出來，只有測試擋得住；反之「按鈕沒反應 / 排版爛」這類**大聲的**錯誤，開 Simulator 就看到，寫測試守它是浪費。

Sprint 3 是第一個 cost-calc sprint（加權平均成本、event-sourced 動態 holdings），是定案這條紀律的最佳時點。使用者完成「信心句練習」列出的五大恐懼，全部落在「**安靜且嚴重**」象限：① 加權平均成本算錯、② Money 進出 Firestore 精度被吃、③ Buy/Sell 混存推導總股數算錯、④ 已實現/未實現損益沒按規格算對、⑤ 報價來源成本過高 / 抓到髒資料導致全盤皆錯。

## Decision

採**風險導向的「獎盃」模型**：測試投資按「壞了多嚴重 × 會不會安靜出錯」分配，不追求均勻覆蓋。底層純邏輯測爆、資料層測契約、極少數關鍵 flow、UI 外觀交給手動 dogfood。**測試守「我家的邏輯」；對外部世界的不信任用「介面 + 邊界驗證 + fallback」這種架構手段防，不是用測試防。**

### 1. 分層紀律

| 層 | 測什麼 | 工具 | 要求 | CI |
| --- | --- | --- | --- | --- |
| 純計算邏輯 | 加權平均成本、holdings 推導、報酬率、匯率換算、損益 | Jest | **TDD（先紅後綠）+ ≥90%**；§4 worked example 直接當 fixture | ✅ 已有 |
| 資料層 transform | `build*Doc(input)` 純物件、Money round-trip、amounts map 對稱 | Jest（純函式） | **≥90%**，限 mapper / calculator 檔（非整個 Service） | ✅ 新增 |
| 資料層 I/O | `setDoc` / `updateDoc` / batch 寫對 collection | emulator smoke | 薄；每條 CRUD 一發 | 🟡 本機（可選 CI） |
| Firestore rules | per-user 隔離、全域 collection 只能讀 | `@firebase/rules-unit-testing` + emulator | 必測 | ✅ 新增（原為缺口） |
| 關鍵 user flow | 新增交易 → 持倉清單數字正確 | RNTL | 挑 **1–2 條**核心，不貪多 | 🟡 本機（可選 CI） |
| 報價邊界 | 拒絕 NaN / 負數 / 0 / 過期時戳 / 離譜跳動 | zod + sanity + fixture contract | provider 介面化，不打外網 | ✅（Sprint 5 起） |
| UI 外觀 / plumbing | 排版、顏色、按鈕接線 | — | **不寫測試**，手動 dogfood | ❌ |

### 2. 樞紐紀律：可測性是設計出來的

強制 service 拆 seam：**純轉換**（`buildTransactionDoc(input, ctx)` 回傳純物件）與 **Firestore I/O**（`writeTransaction(doc)`）分離。如此「安靜且嚴重」的轉換邏輯（②③）落入「純函式」格，便宜又穩，且 refactor I/O 內部不會弄壞測試。此紀律約束所有 feature 的 service 寫法，自 Sprint 3 起。

### 3. CI 變更（`.github/workflows/ci.yml`）

- **新增**：Firestore rules 測試以 emulator 跑進 CI（`firebase emulators:exec` + `setup-java`）。
- **新增**：mobile **純邏輯測試**進 CI（`@assetanchor/mobile test`，純函式不依賴 RNFB native）；Jest `coverageThreshold` 用 path glob **只 gate 純邏輯檔**（mapper / calculator / derivation / store 純 reducer），**排除 screens 與 I/O**。
- **維持**：`packages/shared` global ≥90% gate。
- mobile screen / RNTL flow 測試與 service I/O emulator smoke → **本機手動**；是否進 CI 暫不強制（避免 RNFB native 在 CI 的額外負擔）。

### 4. TDD 適用範圍

- 公式型純邏輯（cost basis / holdings / 報酬率 / 損益 / 匯率換算）**先寫測再實作**；§4 的 worked example（如台積電 avg = 550.76）即首批 fixture。
- 資料層 transform 函式亦先測。
- UI、screen、I/O **不走 TDD**。
- 新增 / 修改 `transaction_type` / `asset_type` / `broker` enum 時必加對應測試（沿用 §13.4 紀律）。

### 5. 報價來源（Sprint 5 前置政策）

恐懼 ⑤ 拆兩半，性質不同：

- **⑤a 工具成本 / 來源可靠度** → **不是測試問題**，是選型 / 架構決策，屬 ADR-0006（`QuoteProvider` 介面化、可替換、評估維護成本、選有 fallback 的來源）。
- **⑤b 髒資料導致全盤錯** → 測得到也守得住：在 provider 邊界做 zod 驗證 + 合理性檢查，把壞資料擋在進入系統之前；用錄好的 fixture 寫 contract 測，不打外網。

### 6. 明確不做（YAGNI，守 §13.6 業餘節奏）

Maestro / E2E、UI 快照測試、screen 覆蓋率門檻、service I/O 的 CI 強制 → **上架前再議**，收錄於 `docs/product-backlog.md`。

## Consequences

- 「會 break 才知道」的高風險區（純邏輯、資料層契約、rules）有安全網，且 **CI 強制**，不會像目前 mobile / rules 測試那樣本機跑、容易腐爛。
- service 必須拆「純轉換 / I/O」seam → 同時是更好的設計（單一職責、可獨立理解），但要求 Sprint 3 起的程式結構配合。
- CI 取得 Firebase emulator + Java 依賴，build 時間與設定略增（一次性）。
- 分層 coverage gate（path glob）需要在 mobile `jest.config.ts` 設定，且仰賴「純邏輯與 I/O 分檔」的檔案組織。
- **限制**：測試買不到「對外部資料源的信任」。⑤a 不在本 ADR 守備範圍，須靠 ADR-0006 的架構決策解。
- 對 Sprint 3 的具體投影：`costBasis` / `holdings` 純函式先測（§4 範例）、service 拆 build / write seam、transaction zod schema 測、rules 擴充 transactions 隔離斷言並進 CI。

## Alternatives Considered

- **維持現行 §13.4（對 mobile 整體從輕）**：最省事，但無法消解使用者對「安靜出錯」的不安，且把 mobile 當單一塊從輕，忽略了 mobile 裡也有「安靜且嚴重」的資料層。否決。
- **輕檔（補純邏輯測試但不動 CI 結構）**：工時最低，但 mobile / rules 測試無 CI 強制、容易腐爛，安全網形同虛設。否決。
- **重檔（加 Maestro E2E + UI 快照 + screen 覆蓋率）**：違反 §13.6 業餘節奏，UI 測試 ROI 低、脆弱。延到上架前再議。
- **不寫獨立 ADR，把測試紀律併入 Sprint 3 的 OpenSpec change**：可行，但測試策略是跨所有 sprint 的持久政策，獨立 ADR 才能被後續 S4 / S5 一致引用。否決。
