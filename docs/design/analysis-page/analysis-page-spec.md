# 分析頁（Analysis）— 高保真設計定稿

> 設計交接文件 · v1 · 2026-06-12
> 對應 `analysis-page-plan.md`（規劃記錄）與 `docs/portfolio_tracker_planning.md` §3 第二/三階段分析功能。
> 沿用 `holdings-overview` 的視覺系統。可操作 prototype 見 `prototype/` 與 standalone HTML。

---

## 0. 這份東西是什麼

把規劃中的「分析頁（亮點頁）」做成**高保真、可操作的設計定稿**，並同步完成**底部導航變更**：

1. **分析頁** — 垂直捲動卡片版型（版型 A），五張圖表
2. **新導航** — Tab Bar 改為 `持倉 / 交易 / 分析 / 設定`（帳戶併入設定）
3. **設定頁（簡易 mock）** — 示意「帳戶管理」併入後的位置

> ⚠️ 設計稿/原型，非正式程式碼。資料為 mock，分析功能屬第二/三階段，**設計先行、實作分階段**。

---

## 1. 探索歷程（為什麼是版型 A）

先做三種版型並排比較（高保真，見 `exploration/AssetAnchor-analysis-layouts.standalone.html`）：

| 版型 | 結構 | 結果 |
|---|---|---|
| **A 垂直捲動卡片** | Hero → 幣別切換 → 5 張圖卡一路捲到底 | ✅ 採用 |
| B 上方維度 tabs | 配置／市值・成本／報酬損益 三維度分頁 | 未選 |
| C 混合式 | hero 總覽（迷你 donut）+ chips 切換比較圖 | 未選 |

**選 A 的理由**：資訊全覽、心智模型最簡單（一個 ScrollView）、實作成本最低；分析頁屬「瀏覽型」頁面，捲動長度可接受。

---

## 2. 重要決策（相對 plan 的更新）

| # | 決策 | 說明 |
|---|---|---|
| D1 | 版型 A（垂直捲動卡片） | 見 §1 |
| D2 | 幣別：**TWD / USD segmented 切換**（預設 TWD） | **取代** plan C 節「統一換 USD」的舊決定；全頁所有金額即時換算 |
| D3 | 圓餅維度：**資產類別（個股 / ETF）** | 每標的佔比改由「市值佔比」橫條圖呈現，圓餅不做 7+ 色切片 |
| D4 | 比較圖四張：市值vs成本／報酬率%／未實現損益／市值佔比 | **年化報酬率暫不做**（演算法屬第二階段，plan B.4 延後） |
| D5 | 比較圖一律**橫向長條**（標的名在左） | 7+ 檔仍可讀、不需橫向捲動；僅市值vs成本用直向雙柱 |
| D6 | 正負分色沿用漲跌色（`#2FD37E` / `#FF5E62`） | 與漲跌數字同一套系統；可由 Tweaks 關閉 |
| D7 | 圖表類別配色：個股 = accent（`#7C6CF0`）、ETF = `#35C6EA` | 藍紫主調的同家族色，不引入新色系 |
| D8 | 互動：**靜態為主** | 圖＋圖例＋數字；不做點擊 drill-down（未來可加） |
| D9 | 導航：`持倉 / 交易 / 分析 / 設定` | 帳戶併入設定（推翻 planning.md §11.2，需同步更新 planning） |

---

## 3. 畫面規格

### 3.1 分析頁（tab「分析」，可捲動）

由上到下：

1. **Header**：標題「分析」(23px/800) + 右側刷新圓鈕（→ toast「報價已更新」）。
2. **Hero**：label「持股市值（TWD|USD）」+ 大數字（32px/800，**count-up 動畫**）+ `▲ 損益金額` `+報酬率%` `全期`；註腳「不含現金 · 匯率 1 USD = 30.95 · 資料延遲 15 分鐘」。
3. **TWD / USD segmented**：切換後全頁金額即時換算（佔比、報酬率%不變）。
4. **圖卡 ×5**（卡片樣式同 holdings 系統，標題 13.5px/700 + 右側小註）：
   - **資產配置**（accent 光暈強調卡）：donut（168px，環厚 28），中心顯示持股市值＋報酬率%；圖例：色塊＋類別＋檔數＋金額＋佔比。
   - **市值 vs 投入成本**：直向雙柱 ×7 標的（成本 = 白 20% 透明、市值 = accent 漸層），nice-number 虛線刻度（如 60K/120K）+ 底線 + 標的代號 + 圖例。
   - **報酬率**：橫向長條，依報酬率排序，正負分色，右側 `+100.0%`。
   - **未實現損益**：同上，右側金額（依幣別）。
   - **市值佔比**：accent 單色長條，右側 `%`。
5. **橫條 row 結構**：左（代號 11.5px/700 + 名稱 9.5px 弱）/ 中（軌道 9px 圓角，填色漸層）/ 右（數值 12px/700）。row 高 36。

### 3.2 導航變更

- Tab Bar：`持倉 / 交易 / 分析 / 設定`；「分析」icon 為圓餅（outline，同 icon 系統 1.8 stroke）。
- **設定頁 mock**：分組列表「帳戶」（帳戶管理〔badge：原「帳戶」tab〕、現金餘額）／「偏好」（顯示偏好、個人資料）／「其他」（關於）。
- 持倉首頁、資產詳情、新增交易 sheet 與 holdings-overview v1 規格相同（v2 原樣保留）。

---

## 4. 互動規格

| 互動 | 行為 |
|---|---|
| 進入分析 tab | 持股市值 count-up（~0.95s） |
| TWD/USD | 全頁金額即時換算（hero、donut 中心、圖例、刻度、損益） |
| 刷新圓鈕 | toast「報價已更新（demo）」 |
| Tweaks | 強調色（4 種藍紫）／甜甜圈⇄實心圓餅／光暈開關／漲跌紅綠開關 |
| 圖表本身 | 靜態（D8） |

---

## 5. 資料假設（mock）

- 沿用 holdings mock（7 檔、4 帳戶、匯率 1 USD = 30.95），統一以 TWD 為內部基準再換算。
- **微調**：00878 市值 21,500 → **20,800**（−2.8%），讓正負分色有示範案例。
- 衍生數字：持股市值 NT$ 455,935／投入成本 NT$ 377,181／未實現 +NT$ 78,754（+20.9%）；個股 44.1% vs ETF 55.9%。
- 報酬率 = (市值 − 成本) / 成本，**不含已實現與配息**（與 MVP 算法一致）。

---

## 6. 與 React Native 實作的對應（建議）

| 設計元素 | 建議落點 |
|---|---|
| Donut / 雙柱 / 橫條圖 | `core/ui/charts/`（純 SVG 可用 react-native-svg 重寫，無第三方圖表庫依賴） |
| nice-number 刻度 (`aNice`) | `packages/shared`（純函式，可單元測試） |
| 分析頁畫面 | `features/analysis/screens/AnalysisOverview`（新 feature module） |
| 類別/幣別聚合計算 | `packages/shared`（由 transactions 衍生，搭配 Money class） |
| 導航 | `core/navigation/`：AccountsStack 移入 SettingsStack 子頁；新增 AnalysisStack |
| 設定頁 | `features/settings/screens/Settings`（含帳戶管理入口） |

> planning.md 需同步：§11 導航樹（帳戶降為設定子頁、加分析 tab）、§3 功能分期註記「分析頁設計已先行定稿」。

---

## 7. 待辦 / 開放問題

- [ ] 年化報酬率圖（待第二階段演算法定案後加入，預期沿用橫條樣式）
- [ ] 標的數量 >10 檔時：佔比/報酬橫條是否 Top N + 「其他」收合
- [ ] 圖表點擊 → 資產詳情（D8 暫不做，未來可加）
- [ ] 產業/帳戶等更多配置維度（本版僅資產類別）
- [ ] 交易紀錄頁（下一個設計項目）

---

## 8. 本資料夾結構

```
analysis-page/
├── analysis-page-plan.md                          ← 規劃記錄（歷史文件，部分決策已被本 spec 取代）
├── analysis-page-spec.md                          ← 本文件
├── AssetAnchor-analysis-page.standalone.html      ← 單檔離線版 v2 prototype（雙擊即開）
├── exploration/
│   └── AssetAnchor-analysis-layouts.standalone.html  ← 三版型並排比較（探索記錄）
└── prototype/                                      ← 可編輯原始碼（React + Babel）
    ├── index.html                                  ← 進入點（CDN 載入 React/Babel）
    ├── aa-core.jsx                                 ← tokens / 假資料 / 共用構件（與 holdings 共用）
    ├── aa-analysis-charts.jsx                      ← 分析衍生資料 + 圖表構件
    ├── aa-analysis-page.jsx                        ← 分析頁畫面
    ├── aa-screens-v2.jsx                           ← v2 App（新導航 + 設定 mock + holdings 畫面）
    └── tweaks-panel.jsx                            ← Tweaks 面板
```
