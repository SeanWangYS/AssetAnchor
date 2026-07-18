# Design — fix-settings-misc-polish

## Context

AssetDetail「平均成本」（Kv row，值為 `position.averageCost`＝含費口徑）與 AssetTransactions「加權均價」同值兩名、皆未標含費。HoldingsOverview 註腳 L~436 靜態字串；quote entry 有 `fetchedAtMs`，AssetDetail 以 `isFresh` + `asOfLabel`（「最後更新 HH:mm · 延遲」）呈現。SettingsScreen：「我的帳號」卡（AABrandLockup+email）、「帳戶」group（帳戶管理＋現金餘額 row）、「偏好」group（個人資料）、「其他」（關於）。`Input`（core/ui）`editable=false` 無視覺差異。ProfileScreen `canSave` 已含 dirty 判斷（值未變 disabled）。AboutScreen `APP_VERSION='0.0.1'` hardcode；`app.config.ts` `version:'0.0.2'`；`apps/mobile/package.json` `0.0.1`。`tsconfig.base` 已開 `resolveJsonModule`。expo-constants 未安裝（裝了要重原生 build）。

## Goals / Non-Goals

**Goals**：五項收尾（P2-5/P3-7/P3-15/P3-16/P3-17）；**Non-goals**：見 proposal。

## Decisions

1. **P2-5**：兩處 label 字面改「均價（含費）」。不動數值與計算（deriveHoldings 含費口徑既定；display-formatting 已管 2 位精度）。
2. **P3-7**（稽核必改落實）：shared 新增 `formatDisplayTime(date): 'HH:mm'`（TDD；取代第二處手拼，AssetDetail 順手收斂）。HoldingsOverview `asOfLabel`：**以 quoteTargets + `quoteFor` 迭代**（勿掃全 store map——含已出清標的舊報價會污染 max）、顯式「有值筆數 > 0 且 maxMs > 0」guard（空集合 Math.max = -Infinity；cache 缺 fetched_at 回 0 會顯 08:00）；文案**並存**「（最後更新 HH:mm · 延遲 15 分鐘）」（fetchedAtMs＝抓取時間 ≠ 報價時刻，替換會高估新鮮度）；無報價維持原句。
3. **P3-15**（兩稽核統一定案）：字面改「登入帳號」「現金餘額（合計）」；「偏好」group 改「**帳號**」（該 group 僅剩個人資料一列，「帳號與偏好」對單列 group 名不副實；個人資料不移位）。三處 owner 拍板可逐一回退。順手同步檔內註解舊用語。
4. **P3-16**：`Input` 解構 `editable`（仍傳 TextInput），`editable === false` 嚴格判斷 → 容器 `wrapDisabled`（背景加深、border 透明）+ 文字 `colors.textSecondary`；**error 紅框優先於 disabled**（樣式順序）。副作用：auth 欄位 `editable={!anyBusy}` 送出忙碌期間短暫全欄 disabled 樣式——語意真實、可接受，列視覺對圖。CashBalanceCard 已改 Text 不受影響。dirty-state：視覺對圖確認 Button disabled 樣式可辨識 → 收案為「程式已有、稽核觀察係樣式不明顯」；Button 樣式本身不動（全 app 共用）。
5. **P3-17**：`apps/mobile/package.json` version → `0.0.2`（同步既發布版本、非發版行為）；死碼 i18n `zh-TW.ts` avgCost/averageCost 同步「均價（含費）」；設計包 `holdings-overview-spec.md` 加註同步；`app.config.ts` 頂部 `import { version } from './package.json'`（ExpoConfig 接受）；AboutScreen `import { version as APP_VERSION } from '../../../../package.json'`。描述句補「加密貨幣（USDT）」。隱私政策：owner-hold。

## Risks / Trade-offs

- [package.json version bump 撞 commitlint/工作流慣例] → 非發版行為、僅同步既發布 0.0.2；owner 拍板項明示。
- [as-of 用 Math.max(fetchedAtMs) 可能混多檔新舊] → 「最後更新」語意＝最近一次成功抓取，混齡由「部分為最後已知報價」既有降級列補充；可接受。
- [「帳號與偏好」重命名仍非完美資訊架構] → 最小改 + owner 拍板；完整 IA 重排屬設計層（backlog）。

## Migration Plan

單 PR（stacked on #64）。Rollback = revert。

## Open Questions

（無。）
