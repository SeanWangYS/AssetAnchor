import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  ASSET_TYPES,
  CURRENCIES,
  MARKETS,
  normalizeSymbolMeta,
  type AssetType,
  type Currency,
} from '@assetanchor/shared';
import { yahooSymbolMetaProvider, type SymbolMetaProvider } from './symbolMetaProvider';

const REGION = 'asia-east1';

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

interface FetchSymbolMetaInput {
  market: string;
  symbol: string;
  assetType: AssetType;
  currency: Currency;
}

type ParseResult = { ok: true; input: FetchSymbolMetaInput } | { ok: false; msg: string };

/**
 * 驗證 query 參數（擋亂打）。CRYPTO 的 `currency` 一律 coerce 為 USD（enable-crypto-quotes
 * design D4）：symbol.currency 是**報價幣別**（crypto 恆 USD），與交易幣別（可 USDT/TWD）
 * 分離；本函式為 symbols 唯一寫入者的入口，在此 coerce 可防禦任何寫入端。
 */
export function parseInput(q: Record<string, unknown>): ParseResult {
  const market = String(q.market ?? '');
  const symbol = String(q.symbol ?? '')
    .trim()
    .toUpperCase();
  const assetType = String(q.assetType ?? '');
  const currency = String(q.currency ?? '');
  if (!(MARKETS as readonly string[]).includes(market) || !symbol) {
    return { ok: false, msg: 'market/symbol 必填且需合法' };
  }
  if (!(ASSET_TYPES as readonly string[]).includes(assetType)) {
    return { ok: false, msg: 'assetType 需合法' };
  }
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, msg: 'currency 需合法' };
  }
  return {
    ok: true,
    input: {
      market,
      symbol,
      assetType: assetType as AssetType,
      currency: market === 'CRYPTO' ? 'USD' : (currency as Currency),
    },
  };
}

/**
 * symbols/{symbolId} 的單一寫入者（design D3）：
 * - 已 enrich（有 name）→ 免抓直接回。
 * - 文件不存在 → 寫完整 SymbolDocument（識別 + is_active + created_at + metadata patch）。
 * - 文件存在但缺 name → 只 merge metadata patch + updated_at（不動識別 / created_at）。
 * provider 查無 metadata 時 fail-soft：不以空值覆寫、不擲錯（回 found=false）。Admin SDK 不受 rules 限制。
 * 純 I/O 核心，可對 emulator 測。
 */
export async function upsertSymbolMeta(
  input: FetchSymbolMetaInput,
  provider: SymbolMetaProvider,
): Promise<{ symbolId: string; found: boolean; created: boolean }> {
  ensureApp();
  const { market, symbol, assetType, currency } = input;
  const symbolId = `${market}_${symbol}`;
  const ref = getFirestore().collection('symbols').doc(symbolId);

  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data();
    if (typeof data?.name === 'string' && data.name.trim().length > 0) {
      return { symbolId, found: true, created: false }; // 已 enrich，免再抓
    }
  }

  const raw = await provider.fetch(market, symbol);
  const patch = raw ? normalizeSymbolMeta(raw) : {};
  const found = Object.keys(patch).length > 0;

  if (!snap.exists) {
    await ref.set({
      symbol_id: symbolId,
      symbol,
      market,
      asset_type: assetType,
      currency,
      is_active: true,
      name: '',
      name_zh: '',
      exchange: '',
      industry: '',
      sector: '',
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      ...patch,
    });
    return { symbolId, found, created: true };
  }

  if (found) {
    await ref.set({ ...patch, updated_at: FieldValue.serverTimestamp() }, { merge: true });
  }
  return { symbolId, found, created: false };
}

/**
 * HTTP `fetchSymbolMeta`（GET ?market=&symbol=&assetType=&currency=）：mobile 於新增交易 /
 * 顯示缺名稱時以 `fetch()` 觸發；後端抓 Yahoo metadata 並 upsert 共用 `symbols/{symbolId}`。
 * 採 onRequest（非 onCall）以免 mobile 需 RNFirebase functions 原生模組——對齊 fetchQuote。
 */
export const fetchSymbolMeta = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const parsed = parseInput(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.msg });
    return;
  }
  try {
    const r = await upsertSymbolMeta(parsed.input, yahooSymbolMetaProvider);
    res.json({ ok: true, ...r });
  } catch (e) {
    logger.error('fetchSymbolMeta failed', { input: parsed.input, error: String(e) });
    res.status(502).json({ ok: false, error: 'symbol metadata 暫時無法取得' });
  }
});
