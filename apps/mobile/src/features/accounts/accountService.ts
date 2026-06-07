import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { Money } from '@assetanchor/shared';
import type { AccountInput, CashBalances } from '@assetanchor/shared';
import { accountsCol, accountDocRef, userDocRef } from '../../core/firestore';
import { db } from '../../services/firebase';

/**
 * 建立帳戶。account_id = Firestore 自動 doc id 回寫欄位（D1）。
 * isFirst 時用 writeBatch 同時設 users.settings.default_account_id（D5）。
 * 回傳新帳戶 account_id。
 */
export async function createAccount(
  uid: string,
  input: AccountInput,
  opts: { displayOrder: number; isFirst: boolean },
): Promise<string> {
  const ref = doc(accountsCol(uid));
  const accountId = ref.id;
  const data = {
    account_id: accountId,
    account_name: input.account_name,
    broker: input.broker,
    account_type: input.account_type,
    base_currency: input.base_currency,
    market: input.market,
    cash_balances: {},
    cash_balances_updated_at: serverTimestamp(),
    is_active: true,
    display_order: opts.displayOrder,
    color: input.color,
    notes: input.notes,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  if (opts.isFirst) {
    const batch = writeBatch(db);
    batch.set(ref, data);
    batch.update(userDocRef(uid), {
      'settings.default_account_id': accountId,
      updated_at: serverTimestamp(),
    });
    await batch.commit();
  } else {
    await setDoc(ref, data);
  }
  return accountId;
}

/** 編輯帳戶基本欄位（account_id / created_at 不可變）。 */
export async function updateAccount(
  uid: string,
  accountId: string,
  input: AccountInput,
): Promise<void> {
  await updateDoc(accountDocRef(uid, accountId), {
    account_name: input.account_name,
    broker: input.broker,
    account_type: input.account_type,
    base_currency: input.base_currency,
    market: input.market,
    color: input.color,
    notes: input.notes,
    updated_at: serverTimestamp(),
  });
}

/**
 * 把使用者輸入的現金字串經 Money 轉成 10 位小數 string（D7）。
 * 空字串略過該幣別；非法數字會由 Money 丟 InvalidMoneyValueError。
 */
export function toCashBalances(input: { USD: string; TWD: string }): CashBalances {
  const balances: CashBalances = {};
  const usd = input.USD.trim();
  const twd = input.TWD.trim();
  if (usd !== '') balances.USD = new Money(usd, 'USD').toDecimalString();
  if (twd !== '') balances.TWD = new Money(twd, 'TWD').toDecimalString();
  return balances;
}

/** 手動更新 cash_balances（非交易衍生）。 */
export async function updateCashBalances(
  uid: string,
  accountId: string,
  balances: CashBalances,
): Promise<void> {
  await updateDoc(accountDocRef(uid, accountId), {
    cash_balances: balances,
    cash_balances_updated_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

/**
 * 停用 / 啟用帳戶（軟刪除）。停用的若為 default 帳戶，於同一 batch 清空
 * users.settings.default_account_id（D5；重指派留 Sprint 3）。
 */
export async function setAccountActive(
  uid: string,
  accountId: string,
  isActive: boolean,
): Promise<void> {
  if (isActive) {
    await updateDoc(accountDocRef(uid, accountId), {
      is_active: true,
      updated_at: serverTimestamp(),
    });
    return;
  }

  const userSnap = await getDoc(userDocRef(uid));
  const isDefault = userSnap.data()?.settings?.default_account_id === accountId;
  if (isDefault) {
    const batch = writeBatch(db);
    batch.update(accountDocRef(uid, accountId), {
      is_active: false,
      updated_at: serverTimestamp(),
    });
    batch.update(userDocRef(uid), {
      'settings.default_account_id': null,
      updated_at: serverTimestamp(),
    });
    await batch.commit();
  } else {
    await updateDoc(accountDocRef(uid, accountId), {
      is_active: false,
      updated_at: serverTimestamp(),
    });
  }
}
