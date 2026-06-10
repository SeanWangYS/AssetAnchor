import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { buildTransactionDoc, type TransactionInput } from '@assetanchor/shared';
import { transactionsCol } from '../../core/firestore';

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
