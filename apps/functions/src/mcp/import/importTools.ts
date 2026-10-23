import { randomBytes } from 'node:crypto';
import * as logger from 'firebase-functions/logger';
import { FieldValue } from 'firebase-admin/firestore';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import {
  buildTransactionDoc,
  type AccountDocument,
  type TransactionDocument,
} from '@assetanchor/shared';
import { upsertSymbolMeta } from '../../symbols/fetchSymbolMeta';
import type { SymbolMetaProvider } from '../../symbols/symbolMetaProvider';
import { guard, toolError, type ToolContext } from '../tools/readTools';
import { WRITE_SCOPE } from '../scopes';
import { signConfirmation, verifyConfirmation } from './confirmation';
import {
  assessImport,
  normalizeImportRow,
  symbolIdOf,
  type ImportRowInput,
  type NormalizeResult,
  type RowReport,
  type SymbolStatus,
} from './importRows';

export const MAX_IMPORT_ROWS = 50;

export interface ImportContext extends ToolContext {
  scopes: readonly string[];
  confirmationKey: Buffer;
  symbolProvider: SymbolMetaProvider;
  now?: () => number;
}

const rowSchema = z.object({
  transaction_date: z.string().describe('交易日 YYYY-MM-DD（截圖看不清楚時先問使用者，不可猜）'),
  symbol: z.string().describe('代號，例如 2330、AAPL；名稱不確定時先用 search_symbol'),
  market: z.string().describe('TW、US、CRYPTO 或 OTHER'),
  transaction_type: z.string().describe('BUY 或 SELL'),
  quantity: z.string().describe('股數，字串，例如 "1000"'),
  price: z.string().describe('成交單價，字串'),
  asset_type: z.string().optional().describe('STOCK（預設）、ETF 等'),
  currency: z.string().optional().describe('預設依市場：TW→TWD、US→USD'),
  fee: z.string().optional().describe('手續費，截圖沒有就省略（視為 0）'),
  tax: z.string().optional().describe('交易稅，截圖沒有就省略（視為 0）'),
  notes: z.string().optional(),
  keep_duplicate: z
    .boolean()
    .optional()
    .describe('只有使用者明確表示要保留疑似重複的列時才設為 true'),
});

const batchShape = {
  account_id: z.string().min(1).describe('list_accounts 取得的 account_id，由使用者選定'),
  transactions: z.array(rowSchema).min(1).describe(`待匯入的交易，一次最多 ${MAX_IMPORT_ROWS} 筆`),
};

interface BatchInput {
  account_id: string;
  transactions: ImportRowInput[];
}

export function ok(summary: string, data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: `${summary}\n${JSON.stringify(data)}` }],
    structuredContent: data,
  };
}

export async function loadAccount(ctx: ToolContext, accountId: string) {
  const snap = await ctx.db
    .collection('users')
    .doc(ctx.uid)
    .collection('accounts')
    .doc(accountId)
    .get();
  return snap.exists ? (snap.data() as AccountDocument) : null;
}

export async function loadTransactions(ctx: ToolContext): Promise<TransactionDocument[]> {
  const snap = await ctx.db.collection('users').doc(ctx.uid).collection('transactions').get();
  return snap.docs.map((d) => d.data() as TransactionDocument);
}

/**
 * Symbols already in AssetAnchor exist; others are confirmed with the quote source (TW/US).
 * CRYPTO and OTHER accept new symbols as the app does.
 */
export async function resolveSymbols(ctx: ImportContext, rows: NormalizeResult[]) {
  const status = new Map<string, SymbolStatus>();
  const targets = new Map<string, { market: string; symbol: string }>();
  for (const r of rows) {
    if (r.ok) targets.set(symbolIdOf(r.row.market, r.row.symbol), r.row);
  }
  const ids = [...targets.keys()];
  const docs = ids.length
    ? await ctx.db.getAll(...ids.map((id) => ctx.db.collection('symbols').doc(id)))
    : [];
  await Promise.all(
    ids.map(async (id, i) => {
      const target = targets.get(id);
      if (!target) return;
      if (docs[i]?.exists) status.set(id, 'exists');
      else if (target.market !== 'TW' && target.market !== 'US') status.set(id, 'new');
      else {
        const meta = await ctx.symbolProvider.fetch(target.market, target.symbol);
        status.set(id, meta ? 'new' : 'missing');
      }
    }),
  );
  return status;
}

interface Assessment {
  normalized: NormalizeResult[];
  reports: RowReport[];
  allOk: boolean;
}

async function assess(ctx: ImportContext, input: BatchInput): Promise<Assessment | CallToolResult> {
  if (input.transactions.length > MAX_IMPORT_ROWS) {
    return toolError(`一次最多匯入 ${MAX_IMPORT_ROWS} 筆，請分批`);
  }
  const account = await loadAccount(ctx, input.account_id);
  if (!account) return toolError('找不到帳戶');
  if (!account.is_active)
    return toolError('此帳戶已停用，請先在 AssetAnchor App 啟用或選擇其他帳戶');

  const normalized = input.transactions.map((t) => normalizeImportRow(t, input.account_id));
  const [existing, symbols] = await Promise.all([
    loadTransactions(ctx),
    resolveSymbols(ctx, normalized),
  ]);
  const reports = assessImport({
    rows: normalized,
    existing,
    symbols,
    accountId: input.account_id,
  });
  return { normalized, reports, allOk: reports.every((r) => r.status === 'ok') };
}

const isResult = (v: Assessment | CallToolResult): v is CallToolResult => 'content' in v;

function summarize(reports: RowReport[]) {
  const count = (s: RowReport['status']) => reports.filter((r) => r.status === s).length;
  return {
    total: reports.length,
    ok: count('ok'),
    duplicate: count('duplicate'),
    invalid: count('invalid'),
    oversell: count('oversell'),
    new_symbols: [
      ...new Set(
        reports
          .filter((r) => r.new_symbol && r.row)
          .map((r) => `${r.row?.market} ${r.row?.symbol}`),
      ),
    ],
  };
}

const boundRows = (normalized: NormalizeResult[]) =>
  normalized.flatMap((r) => (r.ok ? [{ ...r.row }] : []));

export async function validateTransactions(ctx: ImportContext, input: BatchInput) {
  const result = await assess(ctx, input);
  if (isResult(result)) return result;
  const { normalized, reports, allOk } = result;
  const now = (ctx.now ?? Date.now)();
  const confirmation_token = allOk
    ? signConfirmation({
        uid: ctx.uid,
        accountId: input.account_id,
        rows: boundRows(normalized),
        key: ctx.confirmationKey,
        now,
      })
    : null;
  const summary = summarize(reports);
  const next = allOk
    ? '請把每一列（日期、代號、買賣、股數、單價、手續費、交易稅）列給使用者核對，使用者明確確認後，再用相同清單與 confirmation_token 呼叫 create_transactions。'
    : '有問題的列需處理：invalid 請向使用者確認正確值；duplicate 請詢問使用者要移除或保留（保留時設 keep_duplicate: true）；oversell 請確認是否漏了較早的買入。修正後重新驗證。';
  return ok(`驗證完成：${summary.ok}/${summary.total} 列可匯入`, {
    account_id: input.account_id,
    rows: reports,
    summary,
    confirmation_token,
    next_step: next,
  });
}

export async function createTransactions(
  ctx: ImportContext,
  input: BatchInput & { confirmation_token: string },
) {
  if (!ctx.scopes.includes(WRITE_SCOPE))
    return toolError('請在 Claude 重新連線 AssetAnchor 以授權寫入');
  const result = await assess(ctx, input);
  if (isResult(result)) return result;
  const { normalized, reports, allOk } = result;

  if (normalized.some((r) => !r.ok)) {
    return toolError('清單有格式錯誤的列，請先用 validate_transactions 驗證並修正');
  }
  const check = verifyConfirmation(input.confirmation_token, {
    uid: ctx.uid,
    accountId: input.account_id,
    rows: boundRows(normalized),
    key: ctx.confirmationKey,
    now: (ctx.now ?? Date.now)(),
  });
  if (check === 'expired') return toolError('確認已逾時（30 分鐘），請重新驗證後再匯入');
  if (check !== 'ok') return toolError('清單與確認時不同，請重新驗證後再匯入');
  if (!allOk) {
    const problems = reports
      .filter((r) => r.status !== 'ok')
      .map((r) => `第 ${r.index + 1} 列：${r.message ?? r.status}`)
      .join('；');
    return toolError(`資料已變動，整批未匯入。${problems}`);
  }

  const importBatchId = `imp_${randomBytes(9).toString('base64url')}`;
  const col = ctx.db.collection('users').doc(ctx.uid).collection('transactions');
  const batch = ctx.db.batch();
  const ids: string[] = [];
  for (const r of normalized) {
    if (!r.ok) continue;
    const ref = col.doc();
    ids.push(ref.id);
    batch.set(ref, {
      ...buildTransactionDoc(r.input, { transactionId: ref.id }),
      source: 'mcp',
      import_batch_id: importBatchId,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  // Symbol creation after the commit: a metadata hiccup must not undo the user's transactions.
  const newSymbols = new Map<string, NonNullable<RowReport['row']>>();
  for (const r of reports)
    if (r.new_symbol && r.row) newSymbols.set(symbolIdOf(r.row.market, r.row.symbol), r.row);
  await Promise.all(
    [...newSymbols.values()].map(async (row) => {
      try {
        await upsertSymbolMeta(
          {
            market: row.market,
            symbol: row.symbol,
            assetType: row.asset_type,
            currency: row.market === 'CRYPTO' ? 'USD' : row.currency,
          },
          ctx.symbolProvider,
        );
      } catch (err) {
        logger.warn('mcp symbol upsert failed', {
          uid: ctx.uid,
          symbol: `${row.market}_${row.symbol}`,
          error: String(err),
        });
      }
    }),
  );

  return ok(`已匯入 ${ids.length} 筆交易`, {
    import_batch_id: importBatchId,
    transaction_ids: ids,
    count: ids.length,
  });
}

/** Registers validate_transactions (read-only) and create_transactions (write). */
export function registerImportTools(server: McpServer, ctx: ImportContext): void {
  server.registerTool(
    'validate_transactions',
    {
      title: '驗證待匯入交易',
      description:
        '匯入前必用：檢查從截圖整理出的交易（格式、代號、重複、超賣），回傳正規化後的清單與 confirmation_token。不會寫入任何資料。只支援 BUY／SELL；股利等其他類型請告知使用者已略過。日期、代號、買賣、股數、單價看不清楚時要先問使用者，不可猜測。',
      inputSchema: z.object(batchShape),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (input) =>
      guard('validate_transactions', ctx.uid, '暫時無法驗證交易，請稍後再試', () =>
        validateTransactions(ctx, input),
      ),
  );

  server.registerTool(
    'create_transactions',
    {
      title: '匯入交易',
      description:
        '把使用者已在對話中逐筆確認過的清單寫入 AssetAnchor。必須使用 validate_transactions 回傳的 confirmation_token 與完全相同的清單；清單有任何修改都要重新驗證。整批一起寫入，任一列有問題就整批不寫。',
      inputSchema: z.object({
        ...batchShape,
        confirmation_token: z
          .string()
          .min(1)
          .describe('validate_transactions 回傳的 confirmation_token'),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      guard('create_transactions', ctx.uid, '暫時無法匯入交易，請稍後再試', () =>
        createTransactions(ctx, input),
      ),
  );
}
