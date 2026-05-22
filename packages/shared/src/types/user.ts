import type { Currency } from '../enums/currencies.js';

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  default_account_id: string | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  display_name: string;
  preferred_display_currency: Currency;
  preferred_locale: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
  settings: UserSettings;
}

/**
 * Firestore Timestamp 在 mobile (@react-native-firebase) 與 functions (firebase-admin)
 * 兩端型別不同；shared 層用 structural type 抽象，由各端在 boundary 做型別 narrow。
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}
