/* global process, console, fetch */
/* eslint-disable no-console */
/**
 * seed-emulator.mjs — reproducible seed for the local Firebase Emulator Suite.
 *
 * EMULATOR ONLY. Refuses to run unless FIRESTORE_EMULATOR_HOST +
 * FIREBASE_AUTH_EMULATOR_HOST are set, so it can never touch production
 * (assetanchor-832df live). Idempotent: deterministic doc ids + an optional
 * wipe of the test user's data before re-seeding.
 *
 * What it writes (matches the holdings-overview design mock §5 + the exact
 * Firestore schema the app reads — see firebase/firestore.rules,
 * packages/shared/src/{schemas,types,transactions}, and the mobile services):
 *   - 1 Auth user (email/password)            → Auth emulator
 *   - users/{uid}                              (UserDocument shape)
 *   - users/{uid}/accounts/{accountId}   × 4   (AccountDocument; account_id = doc id)
 *   - users/{uid}/transactions/{txId}    × N   (TransactionDocument, ADR-0005 flat
 *                                               single-currency; built like
 *                                               shared/buildTransactionDoc:
 *                                               total = price × quantity, all
 *                                               money fields = Money 10-dp strings)
 *   - symbols/{symbolId}                 × 7   (SymbolDocument; nicer AssetDetail)
 *   - exchange_rates/{date}              × 1   (so the TWD grand total renders;
 *                                               mock rate 1 USD = 30.95 TWD)
 *
 * Money canonical format is reproduced with decimal.js (the exact library the
 * shared Money class wraps) using the same config (precision 30, ROUND_HALF_UP)
 * and the same `.toFixed(10)` canonicalization, so stored strings are
 * byte-identical to Money.toDecimalString(). A self-check asserts this before
 * writing, and a post-write REST read-back validates the doc shapes.
 *
 * Usage (npm script): pnpm --filter @assetanchor/firebase seed:emulator
 * Direct:             FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *                     FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *                     node firebase/scripts/seed-emulator.mjs
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Guardrails: emulator-only.
// ---------------------------------------------------------------------------
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!FIRESTORE_HOST || !AUTH_HOST) {
  console.error(
    '\n[seed] REFUSING TO RUN: emulator host env vars are not set.\n' +
      '       This script must only ever touch the LOCAL emulator, never\n' +
      '       production (assetanchor-832df). Set both:\n' +
      '         FIRESTORE_EMULATOR_HOST=localhost:8080\n' +
      '         FIREBASE_AUTH_EMULATOR_HOST=localhost:9099\n',
  );
  process.exit(1);
}

// Must match firebase.json singleProjectMode / .firebaserc default. The data
// lives only in the emulator (selected by the *_EMULATOR_HOST vars above);
// this id is just the namespace the emulator stores under.
const PROJECT_ID = 'assetanchor-832df';

const TEST_EMAIL = 'test@assetanchor.dev';
const TEST_PASSWORD = 'test1234'; // ≥6 chars (Firebase Auth minimum)
const TEST_DISPLAY_NAME = 'Sean (Demo)';

// ---------------------------------------------------------------------------
// Money helpers — reproduce packages/shared Money's canonical 10-dp format.
// ---------------------------------------------------------------------------
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });
const STORAGE_DECIMALS = 10;

/** Canonical Firestore string — identical to Money(value).toDecimalString(). */
const dec = (value) => new Decimal(value).toFixed(STORAGE_DECIMALS);
/** total = price × quantity, canonicalized — identical to buildTransactionDoc. */
const mul = (a, b) => new Decimal(a).times(new Decimal(b)).toFixed(STORAGE_DECIMALS);

// Self-check: assert our canonicalization matches the documented invariants
// (see docs/runbook/local-testing.md: 500 × 1000 → "500000.0000000000").
(function assertMoneyFormat() {
  const checks = [
    [mul('500', '1000'), '500000.0000000000'],
    [dec('593'), '593.0000000000'],
    [dec('0'), '0.0000000000'],
    [dec('30.95'), '30.9500000000'],
  ];
  for (const [got, want] of checks) {
    if (got !== want) {
      console.error(`[seed] Money format self-check FAILED: got ${got}, want ${want}`);
      process.exit(1);
    }
  }
})();

// ---------------------------------------------------------------------------
// Seed data — design mock §5: 4 accounts, 7 holdings (4 TW / 3 US).
// ---------------------------------------------------------------------------

// account_id values are stable so re-seeding overwrites rather than duplicates.
// broker / account_type / market / base_currency drawn from the shared enums
// (BROKERS, ACCOUNT_TYPES, MARKETS, CURRENCIES). color = #RRGGBB (account schema).
const ACCOUNTS = [
  {
    account_id: 'acc-capital',
    account_name: '群益證券',
    broker: 'CAPITAL_SECURITIES',
    account_type: 'BROKERAGE',
    base_currency: 'TWD',
    market: 'TW',
    color: '#7C6CF0',
    cash_balances: { TWD: dec('158000') },
    display_order: 0,
  },
  {
    account_id: 'acc-fubon',
    account_name: '富邦證券',
    broker: 'FUBON',
    account_type: 'BROKERAGE',
    base_currency: 'TWD',
    market: 'TW',
    color: '#2FD37E',
    cash_balances: { TWD: dec('64200') },
    display_order: 1,
  },
  {
    account_id: 'acc-firstrade',
    account_name: 'Firstrade',
    broker: 'FIRSTRADE',
    account_type: 'BROKERAGE',
    base_currency: 'USD',
    market: 'US',
    color: '#4C6FE8',
    cash_balances: { USD: dec('2150.42') },
    display_order: 2,
  },
  {
    account_id: 'acc-ibkr',
    account_name: 'IBKR',
    broker: 'INTERACTIVE_BROKERS',
    account_type: 'BROKERAGE',
    base_currency: 'USD',
    market: 'US',
    color: '#A368F0',
    cash_balances: { USD: dec('980.00') },
    display_order: 3,
  },
];

// Symbol catalogue (symbols/{symbolId}) — symbol_id is stable + readable.
// currency follows market: TW→TWD, US→USD.
const SYMBOLS = [
  {
    symbol_id: 'TW_2330',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    name: 'TSMC',
    name_zh: '台積電',
    currency: 'TWD',
    exchange: 'TWSE',
    industry: '半導體',
    sector: '科技',
  },
  {
    symbol_id: 'TW_0050',
    symbol: '0050',
    market: 'TW',
    asset_type: 'ETF',
    name: 'Yuanta Taiwan Top 50 ETF',
    name_zh: '元大台灣50',
    currency: 'TWD',
    exchange: 'TWSE',
    industry: 'ETF',
    sector: 'ETF',
  },
  {
    symbol_id: 'TW_2317',
    symbol: '2317',
    market: 'TW',
    asset_type: 'STOCK',
    name: 'Hon Hai Precision',
    name_zh: '鴻海',
    currency: 'TWD',
    exchange: 'TWSE',
    industry: '電子代工',
    sector: '科技',
  },
  {
    symbol_id: 'TW_00878',
    symbol: '00878',
    market: 'TW',
    asset_type: 'ETF',
    name: 'Cathay Sustainability High Dividend ETF',
    name_zh: '國泰永續高股息',
    currency: 'TWD',
    exchange: 'TWSE',
    industry: 'ETF',
    sector: 'ETF',
  },
  {
    symbol_id: 'US_AAPL',
    symbol: 'AAPL',
    market: 'US',
    asset_type: 'STOCK',
    name: 'Apple Inc.',
    name_zh: '蘋果',
    currency: 'USD',
    exchange: 'NASDAQ',
    industry: 'Consumer Electronics',
    sector: 'Technology',
  },
  {
    symbol_id: 'US_VTI',
    symbol: 'VTI',
    market: 'US',
    asset_type: 'ETF',
    name: 'Vanguard Total Stock Market ETF',
    name_zh: 'Vanguard 整體股市 ETF',
    currency: 'USD',
    exchange: 'NYSEARCA',
    industry: 'ETF',
    sector: 'ETF',
  },
  {
    symbol_id: 'US_QQQ',
    symbol: 'QQQ',
    market: 'US',
    asset_type: 'ETF',
    name: 'Invesco QQQ Trust',
    name_zh: 'Invesco 那斯達克 100 ETF',
    currency: 'USD',
    exchange: 'NASDAQ',
    industry: 'ETF',
    sector: 'ETF',
  },
];

// BUY transactions. tx_id stable → re-seed overwrites. quantity/price/fee/tax as
// plain strings here; the builder logic below canonicalizes to 10-dp + computes
// total = price × quantity (ADR-0005 flat single-currency).
// TW fee≈0.1425%, tax 0 on BUY (台股賣出才課證交稅). US fee flat-ish small.
const TX_INPUTS = [
  // --- 群益 (TWD) ---
  {
    tx_id: 'tx-2330-01',
    account_id: 'acc-capital',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    currency: 'TWD',
    transaction_date: '2024-03-14',
    quantity: '1000',
    price: '590',
    fee: '840',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-2330-02',
    account_id: 'acc-capital',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    currency: 'TWD',
    transaction_date: '2024-09-05',
    quantity: '1000',
    price: '910',
    fee: '1296',
    tax: '0',
    notes: '加碼',
  },
  {
    tx_id: 'tx-0050-01',
    account_id: 'acc-capital',
    symbol: '0050',
    market: 'TW',
    asset_type: 'ETF',
    currency: 'TWD',
    transaction_date: '2024-01-10',
    quantity: '2000',
    price: '132.5',
    fee: '377',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-0050-02',
    account_id: 'acc-capital',
    symbol: '0050',
    market: 'TW',
    asset_type: 'ETF',
    currency: 'TWD',
    transaction_date: '2024-11-22',
    quantity: '1000',
    price: '188',
    fee: '267',
    tax: '0',
    notes: '',
  },
  // --- 富邦 (TWD) ---
  {
    tx_id: 'tx-2317-01',
    account_id: 'acc-fubon',
    symbol: '2317',
    market: 'TW',
    asset_type: 'STOCK',
    currency: 'TWD',
    transaction_date: '2024-05-20',
    quantity: '2000',
    price: '155',
    fee: '441',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-00878-01',
    account_id: 'acc-fubon',
    symbol: '00878',
    market: 'TW',
    asset_type: 'ETF',
    currency: 'TWD',
    transaction_date: '2024-02-15',
    quantity: '5000',
    price: '21.3',
    fee: '151',
    tax: '0',
    notes: '高股息',
  },
  {
    tx_id: 'tx-00878-02',
    account_id: 'acc-fubon',
    symbol: '00878',
    market: 'TW',
    asset_type: 'ETF',
    currency: 'TWD',
    transaction_date: '2024-12-03',
    quantity: '5000',
    price: '23.1',
    fee: '164',
    tax: '0',
    notes: '',
  },
  // --- Firstrade (USD) ---
  {
    tx_id: 'tx-aapl-01',
    account_id: 'acc-firstrade',
    symbol: 'AAPL',
    market: 'US',
    asset_type: 'STOCK',
    currency: 'USD',
    transaction_date: '2024-04-08',
    quantity: '25',
    price: '168.45',
    fee: '0',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-aapl-02',
    account_id: 'acc-firstrade',
    symbol: 'AAPL',
    market: 'US',
    asset_type: 'STOCK',
    currency: 'USD',
    transaction_date: '2024-10-18',
    quantity: '15',
    price: '231.78',
    fee: '0',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-vti-01',
    account_id: 'acc-firstrade',
    symbol: 'VTI',
    market: 'US',
    asset_type: 'ETF',
    currency: 'USD',
    transaction_date: '2024-06-03',
    quantity: '30',
    price: '262.4',
    fee: '0',
    tax: '0',
    notes: '',
  },
  // --- IBKR (USD) ---
  {
    tx_id: 'tx-qqq-01',
    account_id: 'acc-ibkr',
    symbol: 'QQQ',
    market: 'US',
    asset_type: 'ETF',
    currency: 'USD',
    transaction_date: '2024-07-29',
    quantity: '20',
    price: '475.6',
    fee: '1',
    tax: '0',
    notes: '',
  },
  {
    tx_id: 'tx-qqq-02',
    account_id: 'acc-ibkr',
    symbol: 'QQQ',
    market: 'US',
    asset_type: 'ETF',
    currency: 'USD',
    transaction_date: '2025-01-15',
    quantity: '10',
    price: '512.3',
    fee: '1',
    tax: '0',
    notes: '',
  },
];

/**
 * Build a TransactionDocument body — mirrors shared/buildTransactionDoc exactly
 * (ADR-0005 flat single-currency: total = price × quantity, ex_date /
 * related_transaction_id / lot_id = null, all money fields 10-dp strings).
 */
function buildTxDoc(input) {
  return {
    transaction_id: input.tx_id,
    account_id: input.account_id,
    asset_type: input.asset_type,
    symbol: input.symbol,
    market: input.market,
    transaction_type: 'BUY',
    transaction_date: input.transaction_date,
    ex_date: null,
    quantity: dec(input.quantity),
    currency: input.currency,
    price: dec(input.price),
    total: mul(input.price, input.quantity),
    fee: dec(input.fee),
    tax: dec(input.tax),
    related_transaction_id: null,
    lot_id: null,
    notes: input.notes ?? '',
  };
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
async function main() {
  const app = initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore(app);
  const auth = getAuth(app);

  // 1) Auth user (idempotent: reuse if the email already exists).
  let uid;
  try {
    const existing = await auth.getUserByEmail(TEST_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, { password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME });
    console.log(`[seed] reused existing auth user ${TEST_EMAIL} (uid=${uid})`);
  } catch {
    const created = await auth.createUser({
      email: TEST_EMAIL,
      emailVerified: true,
      password: TEST_PASSWORD,
      displayName: TEST_DISPLAY_NAME,
    });
    uid = created.uid;
    console.log(`[seed] created auth user ${TEST_EMAIL} (uid=${uid})`);
  }

  // 2) Wipe this user's previous accounts/transactions so re-seed is clean.
  for (const sub of ['accounts', 'transactions']) {
    const snap = await db.collection(`users/${uid}/${sub}`).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }

  // 3) users/{uid} (UserDocument). default_account_id → first account.
  const firstAccountId = ACCOUNTS[0].account_id;
  await db.doc(`users/${uid}`).set({
    uid,
    email: TEST_EMAIL,
    display_name: TEST_DISPLAY_NAME,
    preferred_display_currency: 'TWD',
    preferred_locale: 'zh-TW',
    settings: { theme: 'auto', default_account_id: firstAccountId },
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  // 4) accounts (AccountDocument; account_id = doc id).
  for (const a of ACCOUNTS) {
    await db.doc(`users/${uid}/accounts/${a.account_id}`).set({
      account_id: a.account_id,
      account_name: a.account_name,
      broker: a.broker,
      account_type: a.account_type,
      base_currency: a.base_currency,
      market: a.market,
      cash_balances: a.cash_balances,
      cash_balances_updated_at: FieldValue.serverTimestamp(),
      is_active: true,
      display_order: a.display_order,
      color: a.color,
      notes: '',
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // 5) transactions (TransactionDocument).
  for (const input of TX_INPUTS) {
    const body = buildTxDoc(input);
    await db.doc(`users/${uid}/transactions/${input.tx_id}`).set({
      ...body,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // 6) symbols/{symbolId} (global; SymbolDocument).
  for (const s of SYMBOLS) {
    await db.doc(`symbols/${s.symbol_id}`).set({
      symbol_id: s.symbol_id,
      symbol: s.symbol,
      market: s.market,
      asset_type: s.asset_type,
      name: s.name,
      name_zh: s.name_zh,
      currency: s.currency,
      is_active: true,
      exchange: s.exchange,
      industry: s.industry,
      sector: s.sector,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // 7) exchange_rates/{date} (so the cross-currency TWD grand total renders).
  //    Mock rate: 1 USD = 30.95 TWD (design §3.2 / §5). Store both directions.
  const rateDate = '2025-06-13';
  const usdTwd = '30.95';
  const twdUsd = new Decimal(1).div(new Decimal(usdTwd)).toFixed(STORAGE_DECIMALS);
  await db.doc(`exchange_rates/${rateDate}`).set({
    date: rateDate,
    source: 'BOT',
    rate_type: 'spot_sell',
    rates: { USD_TWD: dec(usdTwd), TWD_USD: twdUsd },
    fetched_at: FieldValue.serverTimestamp(),
    is_estimated: false,
  });

  console.log(
    `[seed] wrote: 1 user, ${ACCOUNTS.length} accounts, ${TX_INPUTS.length} transactions, ` +
      `${SYMBOLS.length} symbols, 1 exchange_rates doc (${rateDate}).`,
  );

  // -------------------------------------------------------------------------
  // Post-write verification via the Firestore emulator REST API (owner token
  // bypasses rules), asserting the docs exist and are schema-shaped.
  // -------------------------------------------------------------------------
  const base = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const headers = { Authorization: 'Bearer owner' };
  const verify = async (path, requiredFields) => {
    const res = await fetch(`${base}/${path}`, { headers });
    if (!res.ok) throw new Error(`[verify] GET ${path} → HTTP ${res.status}`);
    const json = await res.json();
    const fields = json.fields ?? {};
    for (const f of requiredFields) {
      if (!(f in fields)) throw new Error(`[verify] ${path} missing field "${f}"`);
    }
    return fields;
  };
  const listCount = async (path) => {
    const res = await fetch(`${base}/${path}?pageSize=300`, { headers });
    if (!res.ok) throw new Error(`[verify] LIST ${path} → HTTP ${res.status}`);
    const json = await res.json();
    return (json.documents ?? []).length;
  };

  await verify(`users/${uid}`, ['uid', 'email', 'preferred_display_currency', 'settings']);
  const acctFields = await verify(`users/${uid}/accounts/${firstAccountId}`, [
    'account_id',
    'account_name',
    'broker',
    'account_type',
    'base_currency',
    'market',
    'cash_balances',
    'is_active',
    'display_order',
    'color',
  ]);
  const txFields = await verify(`users/${uid}/transactions/${TX_INPUTS[0].tx_id}`, [
    'transaction_id',
    'account_id',
    'asset_type',
    'symbol',
    'market',
    'transaction_type',
    'transaction_date',
    'quantity',
    'currency',
    'price',
    'total',
    'fee',
    'tax',
  ]);
  await verify(`symbols/${SYMBOLS[0].symbol_id}`, [
    'symbol_id',
    'symbol',
    'market',
    'currency',
    'name_zh',
  ]);
  await verify(`exchange_rates/${rateDate}`, ['date', 'source', 'rate_type', 'rates']);

  const acctCount = await listCount(`users/${uid}/accounts`);
  const txCount = await listCount(`users/${uid}/transactions`);
  const symCount = await listCount('symbols');

  // Spot-check a money string is canonical 10-dp + total = price × quantity.
  const total = txFields.total?.stringValue;
  const price = txFields.price?.stringValue;
  const qty = txFields.quantity?.stringValue;
  const expectTotal = mul(TX_INPUTS[0].price, TX_INPUTS[0].quantity);
  if (total !== expectTotal) {
    throw new Error(`[verify] tx total mismatch: got ${total}, want ${expectTotal}`);
  }
  if (!/^\d+\.\d{10}$/.test(price) || !/^\d+\.\d{10}$/.test(qty)) {
    throw new Error(`[verify] money not canonical 10-dp: price=${price} qty=${qty}`);
  }
  const baseCurrency = acctFields.base_currency?.stringValue;
  if (!baseCurrency) throw new Error('[verify] account base_currency not a string');

  console.log(
    `[verify] OK via REST — accounts=${acctCount}, transactions=${txCount}, symbols≥${symCount}; ` +
      `tx total=${total} (= price ${price} × qty ${qty}), canonical 10-dp confirmed.`,
  );
  console.log('\n[seed] DONE. Login creds:');
  console.log(`         email:    ${TEST_EMAIL}`);
  console.log(`         password: ${TEST_PASSWORD}`);
  console.log(`         uid:      ${uid}\n`);
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
