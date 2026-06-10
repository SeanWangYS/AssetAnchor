import { collection, doc, serverTimestamp } from '@react-native-firebase/firestore';
import { db } from '../../services/firebase';

/** Firestore ref helpers — 集中路徑，避免各處硬寫字串。 */
export const userDocRef = (uid: string) => doc(db, 'users', uid);
export const accountsCol = (uid: string) => collection(db, 'users', uid, 'accounts');
export const accountDocRef = (uid: string, accountId: string) =>
  doc(db, 'users', uid, 'accounts', accountId);

export const transactionsCol = (uid: string) => collection(db, 'users', uid, 'transactions');
export const transactionDocRef = (uid: string, transactionId: string) =>
  doc(db, 'users', uid, 'transactions', transactionId);

export { serverTimestamp };
