import * as logger from 'firebase-functions/logger';
import { FieldValue } from 'firebase-admin/firestore';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import {
  buildTransactionDoc,
  findDuplicates,
  findNewOversells,
  sortTransactionsChronologically,
  type NewOversell,
  type TransactionDocument,
} from '@assetanchor/shared';
import { upsertSymbolMeta } from '../../symbols/fetchSymbolMeta';
import { guard, toolError } from '../tools/readTools';
import { WRITE_SCOPE } from '../scopes';
import {
  loadAccount,
  loadTransactions,
  ok,
  resolveSymbols,
  type ImportContext,
} from '../import/importTools';
import { normalizeImportRow, symbolIdOf, type NormalizedRow } from '../import/importRows';
import {
  mergeEdit,
  signEditToken,
  toStoredRow,
  verifyEditToken,
  type EditChanges,
  type StoredRow,
} from './editRows';

export const MAX_DELETE_IDS = 20;

const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

const changesSchema = z.object({
  account_id: z.string().optional().describe('移到另一個帳戶時填寫'),
  transaction_date: z.string().optional(),
  symbol: z.string().optional(),
  market: z.string().optional(),
  transaction_type: z.string().optional(),
  quantity: z.string().optional(),
  price: z.string().optional(),
  asset_type: z.string().optional(),
  currency: z.string().optional(),
  fee: z.string().optional(),
  tax: z.string().optional(),
  notes: z.string().optional(),
});

interface UpdateInput {
  transaction_id: string;
  changes: EditChanges;
  keep_duplicate?: boolean | undefined;
}

interface DeleteInput {
  transaction_ids?: string[] | undefined;
  import_batch_id?: string | undefined;
}

const plain = (v: string) => v.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

function describeOversell(o: NewOversell, rows: readonly StoredRow[], verb: string): string {
  const sell = rows.find((r) => r.transaction_id === o.transaction_id);
  if (!sell) return `${verb}後會造成超賣`;
  return `${verb}後，${sell.transaction_date} 賣出 ${sell.market} ${sell.symbol} ${plain(o.requested)} 股會超賣（可賣 ${plain(o.sellable)}）`;
}

const userTx = (ctx: ImportContext) =>
  ctx.db.collection('users').doc(ctx.uid).collection('transactions');

interface UpdatePlan {
  status: 'ok' | 'invalid' | 'duplicate' | 'oversell';
  message: string | null;
  before: StoredRow;
  after: NormalizedRow | null;
  accountId: string;
  input: ReturnType<typeof normalizeImportRow>;
  newSymbol: boolean;
}

async function planUpdate(
  ctx: ImportContext,
  input: UpdateInput,
): Promise<UpdatePlan | CallToolResult> {
  const all = await loadTransactions(ctx);
  const current = all.find((t) => t.transaction_id === input.transaction_id);
  if (!current) return toolError('找不到交易');
  const before = toStoredRow(current);
  const { accountId, row } = mergeEdit(before, input.changes);
  const base = { before, accountId, after: null, newSymbol: false };

  if (accountId !== before.account_id) {
    const account = await loadAccount(ctx, accountId);
    if (!account) return toolError('找不到帳戶');
    if (!account.is_active) return toolError('此帳戶已停用，請選擇其他帳戶');
  }
  const normalized = normalizeImportRow(
    { ...row, keep_duplicate: input.keep_duplicate },
    accountId,
  );
  if (!normalized.ok)
    return { ...base, status: 'invalid', message: normalized.error, input: normalized };

  const after = normalized.row;
  const symbolId = symbolIdOf(after.market, after.symbol);
  let newSymbol = false;
  if (symbolId !== symbolIdOf(before.market, before.symbol)) {
    const status = (await resolveSymbols(ctx, [normalized])).get(symbolId);
    if (status === 'missing') {
      return {
        ...base,
        after,
        status: 'invalid',
        message: '找不到此代號，請確認代號與市場（若確定正確，請稍後再試）',
        input: normalized,
      };
    }
    newSymbol = status === 'new';
  }

  const others = all.filter((t) => t.transaction_id !== before.transaction_id);
  const edited: StoredRow = {
    ...after,
    transaction_id: before.transaction_id,
    account_id: accountId,
  };
  const dup = findDuplicates(others, [edited]).length > 0;
  if (dup && !after.keep_duplicate) {
    return {
      ...base,
      after,
      newSymbol,
      status: 'duplicate',
      message: '修改後與另一筆交易重複',
      input: normalized,
    };
  }
  const allRows = all.map(toStoredRow);
  const afterRows = [...others.map(toStoredRow), edited];
  const issues = findNewOversells(allRows, afterRows);
  if (issues.length > 0) {
    return {
      ...base,
      after,
      newSymbol,
      status: 'oversell',
      message: issues.map((o) => describeOversell(o, afterRows, '修改')).join('；'),
      input: normalized,
    };
  }
  return { ...base, after, newSymbol, status: 'ok', message: null, input: normalized };
}

const isResult = (v: object): v is CallToolResult => 'content' in v;

const updateToken = (ctx: ImportContext, plan: UpdatePlan, now: number) => ({
  uid: ctx.uid,
  scope: `update:${plan.before.transaction_id}`,
  stored: [plan.before],
  next: plan.after ? [{ ...plan.after, account_id: plan.accountId }] : [],
  key: ctx.confirmationKey,
  now,
});

export async function previewUpdate(ctx: ImportContext, input: UpdateInput) {
  const plan = await planUpdate(ctx, input);
  if (isResult(plan)) return plan;
  const now = (ctx.now ?? Date.now)();
  const confirmation_token =
    plan.status === 'ok' ? signEditToken(updateToken(ctx, plan, now)) : null;
  return ok(
    plan.status === 'ok' ? '可修改，請把修改前後列給使用者確認' : `無法修改：${plan.message}`,
    {
      transaction_id: plan.before.transaction_id,
      before: plan.before,
      after: plan.after ? { ...plan.after, account_id: plan.accountId } : null,
      status: plan.status,
      message: plan.message,
      new_symbol: plan.newSymbol,
      confirmation_token,
    },
  );
}

async function createSymbolIfNew(ctx: ImportContext, row: NormalizedRow) {
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
}

const tokenError = (check: string, staleMessage: string) =>
  check === 'stale'
    ? toolError(staleMessage)
    : check === 'expired'
      ? toolError('確認已逾時（30 分鐘），請重新預覽')
      : toolError('內容與確認時不同，請重新預覽後再執行');

export async function updateTransaction(
  ctx: ImportContext,
  input: UpdateInput & { confirmation_token: string },
) {
  if (!ctx.scopes.includes(WRITE_SCOPE))
    return toolError('請在 Claude 重新連線 AssetAnchor 以授權寫入');
  const plan = await planUpdate(ctx, input);
  if (isResult(plan)) return plan;
  const check = verifyEditToken(
    input.confirmation_token,
    updateToken(ctx, plan, (ctx.now ?? Date.now)()),
  );
  if (check !== 'ok') return tokenError(check, '交易在確認後已被修改，請重新預覽');
  if (plan.status !== 'ok' || !plan.input.ok || !plan.after)
    return toolError(`無法修改：${plan.message ?? plan.status}`);

  await userTx(ctx)
    .doc(plan.before.transaction_id)
    .set(
      {
        ...buildTransactionDoc(plan.input.input, { transactionId: plan.before.transaction_id }),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  if (plan.newSymbol) await createSymbolIfNew(ctx, plan.after);
  return ok('已修改交易', {
    transaction_id: plan.before.transaction_id,
    after: { ...plan.after, account_id: plan.accountId },
  });
}

interface DeletePlan {
  rows: StoredRow[];
  issues: string[];
}

async function planDelete(
  ctx: ImportContext,
  input: DeleteInput,
): Promise<DeletePlan | CallToolResult> {
  const hasIds = (input.transaction_ids?.length ?? 0) > 0;
  if (hasIds === Boolean(input.import_batch_id)) {
    return toolError('請指定 transaction_ids 或 import_batch_id 其中一個');
  }
  if ((input.transaction_ids?.length ?? 0) > MAX_DELETE_IDS) {
    return toolError(`一次最多刪除 ${MAX_DELETE_IDS} 筆；要刪整批匯入請改用 import_batch_id`);
  }
  const all = await loadTransactions(ctx);
  let targets: TransactionDocument[];
  if (input.import_batch_id) {
    targets = all.filter((t) => t.import_batch_id === input.import_batch_id);
    if (targets.length === 0) return toolError('找不到這批匯入');
  } else {
    const ids = [...new Set(input.transaction_ids)];
    const missing = ids.filter((id) => !all.some((t) => t.transaction_id === id));
    if (missing.length > 0) return toolError(`找不到交易：${missing.join('、')}`);
    targets = all.filter((t) => ids.includes(t.transaction_id));
  }
  const removed = new Set(targets.map((t) => t.transaction_id));
  const after = all.filter((t) => !removed.has(t.transaction_id)).map(toStoredRow);
  const issues = findNewOversells(all.map(toStoredRow), after).map((o) =>
    describeOversell(o, after, '刪除'),
  );
  // Oldest first so the user can check the list against the screenshot; tokens digest by ID.
  return { rows: sortTransactionsChronologically(targets).map(toStoredRow), issues };
}

const deleteToken = (ctx: ImportContext, plan: DeletePlan, now: number) => ({
  uid: ctx.uid,
  scope: 'delete',
  stored: plan.rows,
  next: [],
  key: ctx.confirmationKey,
  now,
});

export async function previewDelete(ctx: ImportContext, input: DeleteInput) {
  const plan = await planDelete(ctx, input);
  if (isResult(plan)) return plan;
  const now = (ctx.now ?? Date.now)();
  const okToDelete = plan.issues.length === 0;
  return ok(
    okToDelete
      ? `將刪除 ${plan.rows.length} 筆，請逐筆列給使用者確認`
      : `無法刪除：${plan.issues.join('；')}`,
    {
      transactions: plan.rows,
      count: plan.rows.length,
      issues: plan.issues,
      confirmation_token: okToDelete ? signEditToken(deleteToken(ctx, plan, now)) : null,
    },
  );
}

export async function deleteTransactions(
  ctx: ImportContext,
  input: DeleteInput & { confirmation_token: string },
) {
  if (!ctx.scopes.includes(WRITE_SCOPE))
    return toolError('請在 Claude 重新連線 AssetAnchor 以授權寫入');
  const plan = await planDelete(ctx, input);
  if (isResult(plan)) return plan;
  const check = verifyEditToken(
    input.confirmation_token,
    deleteToken(ctx, plan, (ctx.now ?? Date.now)()),
  );
  if (check !== 'ok') return tokenError(check, '有交易在確認後已被修改或刪除，請重新預覽');
  if (plan.issues.length > 0) return toolError(`無法刪除：${plan.issues.join('；')}`);

  const batch = ctx.db.batch();
  for (const r of plan.rows) batch.delete(userTx(ctx).doc(r.transaction_id));
  await batch.commit();
  return ok(`已刪除 ${plan.rows.length} 筆交易`, {
    deleted: plan.rows.length,
    transaction_ids: plan.rows.map((r) => r.transaction_id),
  });
}

const deleteShape = {
  transaction_ids: z
    .array(z.string().min(1))
    .optional()
    .describe(`要刪除的 transaction_id（最多 ${MAX_DELETE_IDS} 筆，用 list_transactions 取得）`),
  import_batch_id: z.string().optional().describe('刪除整批匯入時改用這個'),
};

/** Registers the edit and delete tools (preview read-only, execute destructive). */
export function registerEditTools(server: McpServer, ctx: ImportContext): void {
  server.registerTool(
    'preview_update_transaction',
    {
      title: '預覽修改交易',
      description:
        '修改交易前必用：列出修改前後內容並檢查是否有效、重複或造成超賣，回傳 confirmation_token。不會寫入。只修改使用者明確指出的欄位。',
      inputSchema: z.object({
        transaction_id: z.string().min(1),
        changes: changesSchema,
        keep_duplicate: z.boolean().optional(),
      }),
      annotations: READ_ONLY,
    },
    async (input) =>
      guard('preview_update_transaction', ctx.uid, '暫時無法預覽修改，請稍後再試', () =>
        previewUpdate(ctx, input),
      ),
  );

  server.registerTool(
    'update_transaction',
    {
      title: '修改交易',
      description:
        '把使用者確認過的修改寫入。必須帶 preview_update_transaction 的 confirmation_token 與相同的修改內容；使用者確認前不可呼叫。',
      inputSchema: z.object({
        transaction_id: z.string().min(1),
        changes: changesSchema,
        keep_duplicate: z.boolean().optional(),
        confirmation_token: z.string().min(1),
      }),
      annotations: DESTRUCTIVE,
    },
    async (input) =>
      guard('update_transaction', ctx.uid, '暫時無法修改交易，請稍後再試', () =>
        updateTransaction(ctx, input),
      ),
  );

  server.registerTool(
    'preview_delete_transactions',
    {
      title: '預覽刪除交易',
      description:
        '刪除交易前必用：以 transaction_id 或 import_batch_id 指定，列出每一筆將被刪除的交易並檢查是否造成超賣，回傳 confirmation_token。不會刪除。刪除無法復原。',
      inputSchema: z.object(deleteShape),
      annotations: READ_ONLY,
    },
    async (input) =>
      guard('preview_delete_transactions', ctx.uid, '暫時無法預覽刪除，請稍後再試', () =>
        previewDelete(ctx, input),
      ),
  );

  server.registerTool(
    'delete_transactions',
    {
      title: '刪除交易',
      description:
        '永久刪除使用者逐筆確認過的交易，無法復原。必須帶 preview_delete_transactions 的 confirmation_token 與相同的指定方式；使用者確認前不可呼叫。',
      inputSchema: z.object({ ...deleteShape, confirmation_token: z.string().min(1) }),
      annotations: DESTRUCTIVE,
    },
    async (input) =>
      guard('delete_transactions', ctx.uid, '暫時無法刪除交易，請稍後再試', () =>
        deleteTransactions(ctx, input),
      ),
  );
}
