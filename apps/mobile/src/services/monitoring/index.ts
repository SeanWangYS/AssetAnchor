import * as Sentry from '@sentry/react-native';

/**
 * client 端錯誤上報（add-sentry-error-reporting）。
 *
 * 啟用條件：非 dev 且非 Emulator 模式（與 firebase 接線同一分流點，見 services/firebase）
 * 且 DSN 有值（EXPO_PUBLIC_SENTRY_DSN，由 eas.json env / EAS secrets 注入，不硬編碼）。
 * 隱私：sendDefaultPii=false；事件 detail 以 symbolId/階段/HTTP status 為限，
 * 不含金額、email、uid（ADR-0005 資料最小化精神）。
 *
 * features 層不 import 本模組（依賴方向紀律）——錯誤經各 services seam
 * （如 services/quotes 的 logQuoteError）集中轉送。
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** dev / Emulator 模式完全停用（本機錯誤不進 dashboard、不產生雜訊）。 */
const ENABLED = !__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR !== 'true' && DSN !== '';

let initialized = false;

/** App 進入點呼叫一次；停用時 no-op（不 init）。 */
export function initErrorReporting(): void {
  if (!ENABLED || initialized) return;
  initialized = true;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    // MVP 只收錯誤事件；performance tracing / session replay 明確不開（proposal Non-goals）。
    tracesSampleRate: 0,
  });
}

/** 已知 fail-soft 邊界的事件上報（保留呼叫端原 console 行為；停用時 no-op）。 */
export function reportHandledError(tag: string, detail: Record<string, unknown>): void {
  if (!ENABLED || !initialized) return;
  Sentry.captureMessage(tag, { level: 'warning', extra: detail });
}
