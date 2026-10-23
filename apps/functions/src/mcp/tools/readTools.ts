import * as logger from 'firebase-functions/logger';
import type { Firestore } from 'firebase-admin/firestore';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import {
  MARKETS,
  type AccountDocument,
  type SymbolDocument,
  type TransactionDocument,
} from '@assetanchor/shared';
import { MAX_PAGE_SIZE, queryTransactions, toTxRow, validateFilter } from './transactionQuery';
import { rankSymbolCandidates, type SymbolRow } from './symbolMatch';

export interface ToolContext {
  db: Firestore;
  /** Firebase uid taken from the verified access token — never from tool input. */
  uid: string;
}

type ToolResult = CallToolResult;

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

function ok(summary: string, data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: `${summary}\n${JSON.stringify(data)}` }],
    structuredContent: data,
  };
}

export function toolError(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Runs a tool body; unexpected failures become a generic 繁中 error and a server log entry. */
export async function guard(
  tool: string,
  uid: string,
  userMessage: string,
  run: () => Promise<ToolResult>,
): Promise<ToolResult> {
  try {
    return await run();
  } catch (err) {
    logger.error('mcp tool failed', { tool, uid, error: String(err) });
    return toolError(userMessage);
  }
}

const userCol = (ctx: ToolContext, name: 'accounts' | 'transactions') =>
  ctx.db.collection('users').doc(ctx.uid).collection(name);

export async function listAccounts(ctx: ToolContext, includeInactive: boolean) {
  const snap = await userCol(ctx, 'accounts').get();
  const accounts = snap.docs
    .map((d) => d.data() as AccountDocument)
    .filter((a) => includeInactive || a.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((a) => ({
      account_id: a.account_id,
      account_name: a.account_name,
      broker: a.broker,
      account_type: a.account_type,
      base_currency: a.base_currency,
      market: a.market,
      is_active: a.is_active,
    }));
  if (accounts.length === 0) {
    return ok('沒有帳戶。請先在 AssetAnchor App 建立帳戶', {
      accounts,
      hint: '請先在 AssetAnchor App 建立帳戶',
    });
  }
  return ok(`共 ${accounts.length} 個帳戶`, { accounts });
}

export interface ListTransactionsInput {
  account_id?: string | undefined;
  symbol?: string | undefined;
  market?: string | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  import_batch_id?: string | undefined;
}

const defined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

export async function listTransactions(ctx: ToolContext, input: ListTransactionsInput) {
  const filter = defined(input);
  const invalid = validateFilter(filter);
  if (invalid) return toolError(invalid);

  let query: FirebaseFirestore.Query = userCol(ctx, 'transactions');
  if (filter.account_id) {
    const account = await userCol(ctx, 'accounts').doc(filter.account_id).get();
    if (!account.exists) return toolError('找不到帳戶');
    query = query.where('account_id', '==', filter.account_id);
  }
  const snap = await query.get();
  const rows = snap.docs.map((d) => toTxRow(d.data() as TransactionDocument));
  const { items, next_cursor } = queryTransactions(rows, filter);
  return ok(`共 ${items.length} 筆交易${next_cursor ? '（還有下一頁）' : ''}`, {
    transactions: items,
    next_cursor,
  });
}

const toSymbolRow = (s: SymbolDocument): SymbolRow => ({
  symbol_id: s.symbol_id,
  symbol: s.symbol,
  market: s.market,
  asset_type: s.asset_type,
  currency: s.currency,
  name: s.name ?? '',
  name_zh: s.name_zh ?? '',
});

export async function searchSymbol(ctx: ToolContext, query: string, market?: string) {
  const q = query.trim().toUpperCase();
  const symbols = ctx.db.collection('symbols');
  const markets = market ? [market] : [...MARKETS];

  const exactRefs = markets.map((m) => symbols.doc(`${m}_${q}`));
  const prefixSnap = await symbols
    .where('symbol', '>=', q)
    .where('symbol', '<', `${q}`)
    .limit(20)
    .get();
  // Name search stays within the user's own symbols to avoid scanning the global collection.
  const txSnap = await userCol(ctx, 'transactions').select('market', 'symbol').get();
  const ownedIds = [
    ...new Set(
      txSnap.docs.map((d) => {
        const t = d.data() as Pick<TransactionDocument, 'market' | 'symbol'>;
        return `${t.market}_${t.symbol}`;
      }),
    ),
  ];
  const ownedRefs = ownedIds.map((id) => symbols.doc(id));
  const docs = await ctx.db.getAll(...exactRefs, ...ownedRefs);

  const candidates = [...docs.filter((d) => d.exists), ...prefixSnap.docs].map((d) =>
    toSymbolRow(d.data() as SymbolDocument),
  );
  const matches = rankSymbolCandidates(query, candidates, market);
  if (matches.length === 0) {
    return ok('AssetAnchor 尚無此代號', {
      symbols: [],
      hint: 'AssetAnchor 尚無此代號。若查的是中文名稱，請先轉成代號再查；新代號可直接交給 validate_transactions 確認',
    });
  }
  return ok(`找到 ${matches.length} 個候選代號`, { symbols: matches });
}

/** Registers the three read-only tools of change 1 on a per-request server. */
export function registerReadTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'list_accounts',
    {
      title: '列出帳戶',
      description:
        '列出使用者在 AssetAnchor 的券商帳戶（account_id、名稱、券商、幣別、市場）。匯入或查詢交易前先用它取得 account_id。',
      inputSchema: z.object({
        include_inactive: z.boolean().optional().describe('是否包含已停用的帳戶，預設 false'),
      }),
      annotations: READ_ONLY,
    },
    async ({ include_inactive }) =>
      guard('list_accounts', ctx.uid, '暫時無法讀取帳戶，請稍後再試', () =>
        listAccounts(ctx, include_inactive ?? false),
      ),
  );

  server.registerTool(
    'list_transactions',
    {
      title: '查詢交易',
      description:
        '依帳戶、代號、日期查詢使用者的交易，由新到舊排序，回傳 transaction_id。金額與數量為 10 位小數的字串，請勿當成浮點數四捨五入。',
      inputSchema: z.object({
        account_id: z.string().min(1).optional(),
        symbol: z.string().min(1).max(20).optional().describe('代號，例如 2330、AAPL'),
        market: z.enum(MARKETS).optional(),
        date_from: z.string().optional().describe('起始日期 YYYY-MM-DD（含）'),
        date_to: z.string().optional().describe('結束日期 YYYY-MM-DD（含）'),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional().describe('每頁筆數，預設 50'),
        cursor: z.string().optional().describe('上一頁回傳的 next_cursor'),
        import_batch_id: z.string().optional().describe('只看某次 create_transactions 匯入的交易'),
      }),
      annotations: READ_ONLY,
    },
    async (input) =>
      guard('list_transactions', ctx.uid, '暫時無法讀取交易，請稍後再試', () =>
        listTransactions(ctx, input),
      ),
  );

  server.registerTool(
    'search_symbol',
    {
      title: '查詢代號',
      description:
        '用代號確認 AssetAnchor 的 symbol 與市場，最多回傳 10 個候選。名稱比對只涵蓋使用者交易過的股票；截圖只有中文名稱時（例如「元大台灣50」），先依自身知識轉成代號（0050）再查，並在確認清單寫出代號與名稱讓使用者核對。',
      inputSchema: z.object({
        query: z.string().min(1).max(50).describe('代號或名稱'),
        market: z.enum(MARKETS).optional(),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, market }) =>
      guard('search_symbol', ctx.uid, '暫時無法查詢代號，請稍後再試', () =>
        searchSymbol(ctx, query, market),
      ),
  );
}
