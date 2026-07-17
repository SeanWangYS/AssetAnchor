# Design — fix-auth-polish

## Context

SignIn banner 條件渲染（`{banner ? <View style={styles.banner}> : null}`）、form gap 佈局——出現即下推整個表單；欄位錯誤由 `Input` 條件渲染一行。email Input 未設 `autoCorrect/spellCheck`（RN 預設開）。skip 入口無任何 gate（僅註解「正式版移除」）。`authErrorMessage` 用「Email 或密碼錯誤。」等（spec §錯誤文案表：「電子郵件或密碼錯誤，請再試一次」）。ForgotPassword 無 AABrandLockup、標題靠左（SignUp 有 lockup 且置中）。連結 Pressable 僅 `hitSlop={8}`。登出 ConfirmDialog message 第二句對 Google 使用者不精確；`ConfirmDialog` backdrop `rgba(0,0,0,0.6)`。

## Goals / Non-Goals

**Goals**：四項一次修；**Non-goals**：見 proposal。

## Decisions

1. **P2-10a banner slot**：banner 容器改常駐固定高度 slot（`minHeight` 以模擬器單行實測定案，估 44），**無錯誤時渲染空 View 佔位（勿 opacity:0——Text 會留在 a11y tree）**。多行錯誤容器可長高。三案取捨：原型（aa-auth.jsx）為條件渲染＋flex spacer 吸收位移，RN 版用固定 margin 無 spacer——佔位是三案（佔位/overlay/動畫）中唯一保證欄位恆位的；常駐留白為自覺偏離、owner 對圖兜底。inline 欄位錯誤不動（Non-goal，全 app 共用 Input）。
2. **P2-10b**：三畫面 email `Input` 補 `autoCorrect={false} spellCheck={false}`（keyboardType 已 email-address，補齊即無紅點底線）。
3. **P2-12**：footer skip Pressable 包 `{__DEV__ ? ... : null}`；註解改「**DEV** only——spec 明定正式版移除；本地 emulator 驗證仍需」。
4. **P3-18a 文案**：authErrors 逐碼改：invalid-email→「電子郵件格式不正確。」、wrong-password/invalid-credential/user-not-found→「電子郵件或密碼錯誤，請再試一次。」（spec 表同時把 user-not-found 歸帳密錯誤——不洩漏帳號存在性，安全上也正確）、already-in-use→「此電子郵件已被註冊，請改用其他信箱或直接登入。」（spec L58 全文——截短即違反「對齊 spec」宣稱）、其餘僅 Email→電子郵件字面替換。SignIn/SignUp fallback「登入失敗，請再試一次。」保留。
5. **P3-18b 版式**：ForgotPassword 表單態補 `AABrandLockup`（markSize 同 SignUp）+ head 置中；標題「忘記密碼」置中、subtitle 補 `textAlign:'center'`（僅容器 alignItems 不夠）、字級保留 FP 原值。成功態不動。
6. **P3-18c 觸控**：連結 Pressable 加 `minHeight: 44, justifyContent: 'center'`（style 層，不動 hitSlop）；SignIn footer skip 同。
7. **P3-19**：SettingsScreen 登出 message →「確定要登出嗎？」；ConfirmDialog backdrop → `rgba(0,0,0,0.75)`（全 app 對話框一致加深——帳戶停用等 dialog 同受益）。

## Risks / Trade-offs

- [banner 常駐佔位讓無錯誤時多 ~44px 留白] → 表單本就「沉於下半」佈局、留白融入節奏；比跳動好（audit 主訴求）。
- [`__DEV__` gate 使 release 無 demo 入口] → 即 spec 要求；dogfood 用真帳號。
- [scrim 全域加深] → 影響所有 ConfirmDialog——視覺對圖確認可辨識度提升而非過暗。

## Migration Plan

單 PR（stacked on #64）。Rollback = revert。

## Open Questions

（無。）
