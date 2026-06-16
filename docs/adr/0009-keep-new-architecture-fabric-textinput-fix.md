# ADR-0009: 保留 React Native New Architecture（修 Fabric TextInput 失焦，不退回 Paper）

- **狀態**：Accepted
- **日期**：2026-06-16
- **相關**：ADR-0008（align-to-design）、`apps/mobile/app.config.ts`、`apps/mobile/src/core/ui/Input.tsx`、`docs/superpowers/plans/ios-simulator-automation-e2e-plan.md`

## Context

Expo SDK 54 / RN 0.81 預設啟用 **New Architecture（Fabric 渲染器 + TurboModules + Bridgeless）**。在 align-to-design 視覺驗收（2026-06-15）時，iOS Simulator 上出現嚴重 bug：**點 TextInput 後游標一閃即失焦、實體鍵盤與螢幕鍵盤都打不進字，只有 paste（UIKit `insertText`）有效**；同台模擬器的原生 app（提醒事項）打字正常。

當下為了不卡開發，先以 `newArchEnabled: false`（退回 Paper 架構）作 workaround——Paper 的 TextInput 正常。但 Paper 是**被淘汰中的架構**：

- RN 0.82 起新架構為唯一、無法關閉；
- **Expo SDK 55（RN 0.83，2026-02 已釋出）直接移除 `newArchEnabled` 與 Paper 退路**。

所以「停在 Paper」是**有硬期限的技術債**——下次升 SDK 就被迫面對同一個 bug，且沒有退路。owner 決定先用 workaround 解當下（ADR 前身），但要求調查能否乾淨翻回新架構。

**調查結論（root cause 已確認）**：根因是 **RN #45798 — Fabric 的 view-flattening**。當包住 TextInput 的 View 帶有「**focus 時才套用的 shadow/border/opacity/transform**」style，Fabric 的 differentiator 會對該 view 做 `remove` + `insert` mutation，`remove` 當下內層 TextInput 失焦 → 鍵盤收掉。我們的 `core/ui/Input.tsx` 正是 focus 時才套 `focusRing` 柔光環（`shadowColor`），每個輸入框都中。Paper 沒有 view-flattening 所以不會發生——這也解釋了「退回 Paper 就正常」。**不是 iOS 版本、不是 RNFB／static frameworks／svg 的交互、也沒有任何 RN/Expo 版本專門修這個確切症狀。**

## Decision

**維持 New Architecture 啟用（`newArchEnabled: true`，與 SDK 54 預設一致），用官方修法解掉 root cause，不退回 Paper。**

1. **修法**：在 `core/ui/Input.tsx` 包住 TextInput、且 focus 時切換陰影的 `field` 容器加 **`collapsable={false}`**（RN #45798 官方 workaround），告訴 Fabric 不要 flatten 該 view，避免 focus 時的 remove+insert，TextInput 即不再失焦。零升級、零第三方依賴、純 JS。
2. **驗證**：`newArchEnabled: true` → `expo prebuild --clean -p ios` → 原生重編譯重裝後，owner 在 Simulator 實測——TextInput 鍵盤輸入恢復正常（中英文皆可）。New Architecture 是原生編譯期設定，JS reload 改不動，故此驗證確認修法在新架構下成立。
3. **不升 SDK**：留在 SDK 54（仍保有 `newArchEnabled` 退路作理論安全網，但已不需要）。升 SDK 55/56 留待 MVP 後依其他需求評估。

## Consequences

**正面**

- **消除技術債**：留在 RN 預設且唯一的未來架構，升 SDK 時不會被迫在壓力下臨時遷移。
- 修法極小、純 JS、無新依賴、無原生風險；可逆。
- 同時保有 SDK 54 的 Paper 退路（理論安全網）。

**負面 / 注意事項**

- **新的團隊慣例**：日後任何「在 TextInput 容器上 focus 時切換 shadow/border/opacity/transform」的元件，都要記得加 `collapsable={false}`（Fabric view-flattening 的已知坑）。已在 `Input.tsx` 註解標明。
- 此類 conditional-style-around-focusable-view 在 Fabric 下都可能復現同類失焦；視為已知 pattern，新元件需留意。
- 自動化 E2E（Maestro `inputText`，走 XCUITest path）本就不受架構影響，見自動化方案文件。

## Alternatives considered

- **A. 停在 Paper（`newArchEnabled: false`）**：否決。Paper 被淘汰、SDK 55 移除退路（硬期限），債只會越滾越大；而 bug 其實有便宜修法。
- **B. 升 Expo SDK 55/56 求「內建修復」**：否決。沒有任何版本修這個確切症狀；SDK 55 反而**強制**新架構（移除退路）等於直接撞上同一 bug；且 `useFrameworks: 'static'`（RNFB）與 precompiled RN 的編譯摩擦會變大。升級延到 MVP 後依自身價值評估。
- **C. 等 iOS 26.2 / upstream 修**（另一個 root-cause 假說：iOS 26 UIKit first-responder bug）：不需要。view-flattening 修法已直接解決；該假說為旁證、權重較低。

## References

- RN #45798（TextInput 失焦根因 + `collapsable={false}` 修法）：https://github.com/facebook/react-native/issues/45798
- RN view-flattening 機制：https://reactnative.dev/architecture/view-flattening
- RN #45297（`showSoftInputOnFocus` New Arch，已修於 0.76）、#47359/#47576（Bridgeless 程式性 focus 時序，已修）
- Expo SDK 55 changelog（RN 0.83、移除 Paper 退路）：https://expo.dev/changelog/sdk-55
- 本次 spike：`apps/mobile/src/core/ui/Input.tsx`（collapsable）、`apps/mobile/app.config.ts`（newArchEnabled: true）
