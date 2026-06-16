import { deleteDoc, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { buildTransactionDoc, type TransactionInput } from '@assetanchor/shared';
import { transactionDocRef, transactionsCol } from '../../core/firestore';

/**
 * 寫入一筆交易（ADR-0007 seam 的 I/O 端）。純文件組裝在 shared 的
 * `buildTransactionDoc`（已單元測試），本層只負責：取 Firestore 自動 doc id、
 * 呼叫 builder、補 serverTimestamp 後 setDoc。回傳新交易的 transaction_id。
 */
export async function writeTransaction(uid: string, input: TransactionInput): Promise<string> {
  const ref = doc(transactionsCol(uid));
  const built = buildTransactionDoc(input, { transactionId: ref.id });
  await setDoc(ref, {
    ...built,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

/**
 * 更新既有交易（編輯）。沿用同一個 `buildTransactionDoc` 重組主體（保留原
 * transaction_id），保留原 created_at、刷新 updated_at（merge 寫回）。
 *
 * 註：MVP zod schema 僅收 BUY；編輯保存的型別轉換與精度同新增路徑一致。
 */
export async function updateTransaction(
  uid: string,
  transactionId: string,
  input: TransactionInput,
): Promise<void> {
  const built = buildTransactionDoc(input, { transactionId });
  await setDoc(
    transactionDocRef(uid, transactionId),
    { ...built, updated_at: serverTimestamp() },
    { merge: true },
  );
}

/** 刪除一筆交易（交易詳情的破壞性動作，前置 ConfirmDialog）。 */
export async function deleteTransaction(uid: string, transactionId: string): Promise<void> {
  await deleteDoc(transactionDocRef(uid, transactionId));
}
