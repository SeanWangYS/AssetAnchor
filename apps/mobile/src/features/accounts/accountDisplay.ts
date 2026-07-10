import { Money, deriveHoldingsForAccountSafe } from '@assetanchor/shared';
import type {
  AccountDocument,
  AccountType,
  Broker,
  Currency,
  SafeHoldingsResult,
  TransactionDocument,
} from '@assetanchor/shared';

/** 跨帳戶現金總覽顯示時的幣別順序（TWD 先、USD 次；其餘依插入序）。 */
const CASH_CURRENCY_ORDER: Currency[] = ['TWD', 'USD'];

/**
 * 帳戶顯示層純函式 —— enum→繁中標籤、貨幣前綴、金額格式、該帳戶持股推導。
 * 不落地、不做 FX；跨幣別合計交給顯示時的最新匯率（本 feature 內不引匯率服務，
 * hero 只在 base_currency 同幣別範圍內合計，跨幣別部分標示為另計，見 AccountDetailScreen 註）。
 */

/** 券商 enum → 繁中 / 通用顯示名（無對照時回原 enum）。 */
const BROKER_LABELS: Record<Broker, string> = {
  FIRSTRADE: 'Firstrade',
  INTERACTIVE_BROKERS: 'Interactive Brokers',
  MOOMOO: 'moomoo',
  SCHWAB: 'Charles Schwab',
  FIDELITY: 'Fidelity',
  ROBINHOOD: 'Robinhood',
  TD_AMERITRADE: 'TD Ameritrade',
  CAPITAL_SECURITIES: '群益證券',
  SINOPAC: '永豐金證券',
  FUBON: '富邦證券',
  YUANTA: '元大證券',
  CATHAY: '國泰證券',
  CTBC: '中國信託證券',
  MASTERLINK: '元富證券',
  KGI: '凱基證券',
  MEGA: '兆豐證券',
  BINANCE: 'Binance',
  COINBASE: 'Coinbase',
  KRAKEN: 'Kraken',
  MAX: 'MAX',
  BITOPRO: 'BitoPro',
  OTHER: '其他',
};

/** 帳戶類型 enum → 繁中標籤。 */
const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BROKERAGE: '證券帳戶',
  IRA: '退休帳戶（IRA）',
  MARGIN: '融資帳戶',
  CASH: '現金帳戶',
  CRYPTO_EXCHANGE: '加密貨幣交易所',
  CRYPTO_WALLET: '加密貨幣錢包',
  OTHER: '其他',
};

export function brokerLabel(broker: Broker): string {
  return BROKER_LABELS[broker] ?? broker;
}

/**
 * 帳戶識別色圓標的 monogram —— 取帳戶名第一個字（中文取首字、拉丁取首字母大寫）。
 * Avatar 對單字元一律顯示完整字元，故傳首字即得正確 monogram（避免整個帳戶名塞進圓標）。
 */
export function accountMonogram(name: string): string {
  const ch = [...name.trim()][0] ?? '?';
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
}

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

/** 幣別前綴（§5：NT$ / US$）。 */
export function currencyPrefix(currency: Currency): string {
  return currency === 'TWD' ? 'NT$' : currency === 'USD' ? 'US$' : `${currency} `;
}

/** 顯示用小數位：USD 2 位、其餘（TWD 等）0 位（對齊 holdings displayDecimals / 設計 mock）。 */
function displayDecimalsFor(currency: Currency): number {
  return currency === 'USD' ? 2 : 0;
}

/** 帶千分位的金額字串（toNumber 為顯示逃生門，對齊 app 其他畫面的 toLocaleString 慣例）。 */
function formatAmount(money: Money, currency: Currency): string {
  const dp = displayDecimalsFor(currency);
  return money.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** 以 Money 格式化（千分位；USD 2 位 / TWD 0 位）+ 幣別前綴。 */
export function formatMoney(value: string, currency: Currency): string {
  return `${currencyPrefix(currency)} ${formatAmount(Money.fromDecimalString(value, currency), currency)}`;
}

/**
 * 該帳戶持股（逐-symbol 容錯）—— 委派 shared `deriveHoldingsForAccountSafe`：以 account_id 過濾後
 * 依 (market, symbol) 分組逐組推導，單一 symbol 因歷史爛資料（帳戶層級超賣 / orphan SELL / 混幣別）
 * throw 時只跳過該檔（收進 `skipped`、log），**其餘持股照常回傳**——不再因單檔失敗整包回 `[]` 白屏。
 *
 * 全域 `deriveHoldings` 的 fail-loud 語意維持不變（ADR-0007）；本邊界只做帳戶層級顯示容錯。
 * 回傳 `{ positions, skipped }`：合法持倉 + 資料異常被跳過的 (market, symbol) 清單（供畫面標示）。
 */
export function holdingsForAccount(
  transactions: TransactionDocument[],
  accountId: string,
): SafeHoldingsResult {
  return deriveHoldingsForAccountSafe(transactions, accountId);
}

/**
 * 跨（啟用）帳戶現金總計，依幣別以 `Money` 加總（ADR-0005，不用 native float）。
 * 僅納入 `is_active` 帳戶；缺/空餘額視為 0；回傳僅含有非零餘額的幣別。
 */
export function cashTotalsByCurrency(accounts: AccountDocument[]): Map<Currency, Money> {
  const sums = new Map<Currency, Money>();
  for (const acc of accounts) {
    if (!acc.is_active) continue;
    for (const [ccy, str] of Object.entries(acc.cash_balances)) {
      if (!str) continue;
      const c = ccy as Currency;
      const amount = Money.fromDecimalString(str, c);
      const prev = sums.get(c) ?? Money.zero(c);
      sums.set(c, prev.add(amount));
    }
  }
  // 僅保留有餘額（非零）的幣別。
  for (const [c, money] of [...sums.entries()]) {
    if (money.isZero()) sums.delete(c);
  }
  return sums;
}

/**
 * 跨帳戶現金總計顯示字串，如「NT$ 222,200 · US$ 3,130.42」（對齊設定頁 mock；千分位、USD 2 位 / TWD 0 位）。
 * 僅顯示有餘額幣別；全無餘額回 "NT$ 0"（設定頁不留空白列）。TWD 先、USD 次、其餘依插入序。
 */
export function formatCashTotals(accounts: AccountDocument[]): string {
  const sums = cashTotalsByCurrency(accounts);
  if (sums.size === 0) return `${currencyPrefix('TWD')} ${formatAmount(Money.zero('TWD'), 'TWD')}`;
  const ordered: Currency[] = [
    ...CASH_CURRENCY_ORDER.filter((c) => sums.has(c)),
    ...[...sums.keys()].filter((c) => !CASH_CURRENCY_ORDER.includes(c)),
  ];
  return ordered
    .map((c) => `${currencyPrefix(c)} ${formatAmount(sums.get(c) ?? Money.zero(c), c)}`)
    .join(' · ');
}

/** 把 Firestore timestamp（或可被 Date 解析的值）格式化為「YYYY/MM/DD HH:mm」快照字串。 */
export function formatSnapshot(updatedAt: unknown): string | undefined {
  const d = toDate(updatedAt);
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  // Firestore Timestamp（modular SDK）：toDate()。
  if (typeof value === 'object' && 'toDate' in value) {
    const fn = (value as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') {
      const d = fn.call(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
