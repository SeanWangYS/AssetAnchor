import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Market } from '@assetanchor/shared';

// React Navigation requires param lists to carry an implicit string index
// signature (ParamListBase). `interface` does not provide one, so these must
// stay as `type` aliases — hence the targeted rule disables below.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

/**
 * Root native-stack：MainTabs + 共用 Modal group（design.md §1）。
 * - AddTransaction：持倉 header ＋ / AssetDetail「為此標的新增交易」/ 交易 FAB 共用 sheet。
 * - EditTransaction：reuse AddTransaction 同 sheet 帶值（標題改「編輯交易」）。Phase 4 接表單帶值。
 * - AddAccount：帳戶 FAB（AccountsStack 現掛在設定下）。
 * - DateRange：期間篩選 sheet（全部/本月/近三月/今年 + 自訂）。Phase 4 接內容。
 */
export type RootStackParamList = {
  MainTabs: undefined;
  AddAccount: undefined;
  AddTransaction: undefined;
  // —— 預留（param list 先佔位，畫面 Phase 4 接）——
  EditTransaction: { transactionId: string };
  DateRange: undefined;
};

/**
 * 底部 tab 恰好 4 個（design.md §1 / README）：持倉 / 交易 / 分析 / 設定。
 * 帳戶不再是 tab —— 降為設定子頁（SettingsStack 內掛 AccountsStack）。
 */
export type MainTabsParamList = {
  Holdings: undefined;
  Transactions: undefined;
  Analysis: undefined;
  Settings: undefined;
};

/** 持倉 in-tab stack：Overview → AssetDetail → 個股完整交易歷史（AssetTransactions）。 */
export type HoldingsStackParamList = {
  HoldingsOverview: undefined;
  AssetDetail: { market: Market; symbol: string };
  AssetTransactions: { market: Market; symbol: string };
};

/** 交易 in-tab stack：TransactionList（時間軸）→ TransactionDetail（檢視/編輯/刪除）。 */
export type TransactionsStackParamList = {
  TransactionList: undefined;
  TransactionDetail: { transactionId: string };
};

/** 分析 in-tab stack：單頁 AnalysisOverview（hero + 圖表卡，靜態無 drill-down）。 */
export type AnalysisStackParamList = {
  AnalysisOverview: undefined;
};

/** 帳戶 stack：AccountList → AccountDetail。現掛在 SettingsStack 之下作為子頁（非 tab）。 */
export type AccountsStackParamList = {
  AccountList: undefined;
  AccountDetail: { accountId: string };
};

/**
 * 設定 in-tab stack：SettingsHome（分組清單）+ 帳戶子頁（掛 AccountsStack）
 * + 偏好（顯示偏好 / 個人資料）+ 其他（關於）佔位頁。
 */
export type SettingsStackParamList = {
  SettingsHome: undefined;
  /** 帳戶管理子頁 —— 掛載整個 AccountsStack（巢狀 navigator 作為一個 screen）。 */
  Accounts: undefined;
  DisplayPrefs: undefined;
  Profile: undefined;
  About: undefined;
};
/* eslint-enable @typescript-eslint/consistent-type-definitions */

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabsScreenProps<T extends keyof MainTabsParamList> = BottomTabScreenProps<
  MainTabsParamList,
  T
>;

// A tab screen that also needs to reach the Root stack's Modal group
// (e.g. the Transactions tab opening the AddTransaction modal).
export type MainTabsModalScreenProps<T extends keyof MainTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Holdings screens live in a native-stack nested inside the Holdings tab and
// can also reach the Root modal group (e.g. AddTransaction). CompositeScreenProps
// composes the in-stack navigation with the Root stack.
export type HoldingsStackScreenProps<T extends keyof HoldingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HoldingsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Transactions screens mirror the Holdings pattern (list → detail in-tab stack,
// can also reach the Root modal group, e.g. AddTransaction / EditTransaction).
export type TransactionsStackScreenProps<T extends keyof TransactionsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<TransactionsStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Analysis screens can reach the Root modal group (e.g. DateRange sheet).
export type AnalysisStackScreenProps<T extends keyof AnalysisStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AnalysisStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Settings screens can reach the Root modal group (e.g. confirm-logout sheet,
// AddAccount when drilling into the nested AccountsStack sub-page).
export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Accounts screens live in a native-stack nested inside the Settings tab's
// Accounts sub-page. CompositeScreenProps lets them navigate both within
// AccountsStack and up to the Root stack (e.g. the AddAccount modal).
export type AccountsStackScreenProps<T extends keyof AccountsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AccountsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;
