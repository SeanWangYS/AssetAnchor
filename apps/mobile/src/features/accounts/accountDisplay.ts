import { Money, deriveHoldings } from '@assetanchor/shared';
import type {
  AccountType,
  Broker,
  Currency,
  Position,
  TransactionDocument,
} from '@assetanchor/shared';

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

/** 以 Money 格式化（2 位小數顯示）+ 幣別前綴。 */
export function formatMoney(value: string, currency: Currency): string {
  return `${currencyPrefix(currency)} ${Money.fromDecimalString(value, currency).toDisplayString()}`;
}

/**
 * 該帳戶持股 —— 先以 account_id 過濾交易再推導（deriveHoldings 本身跨帳戶聚合，
 * 故需先過濾；跨 feature 讀 transactions 為 codebase 既有慣例，見 useHoldings）。
 */
export function holdingsForAccount(
  transactions: TransactionDocument[],
  accountId: string,
): Position[] {
  return deriveHoldings(transactions.filter((t) => t.account_id === accountId));
}

/** 該帳戶持股市值（原幣別）合計 —— MVP 無即時報價，以總成本為市值代理（對齊 HoldingsOverview）。 */
export function holdingsValueByCurrency(positions: Position[]): Partial<Record<Currency, Money>> {
  const sums: Partial<Record<Currency, Money>> = {};
  for (const p of positions) {
    const prev = sums[p.currency] ?? Money.zero(p.currency);
    sums[p.currency] = prev.add(Money.fromDecimalString(p.totalCost, p.currency));
  }
  return sums;
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
