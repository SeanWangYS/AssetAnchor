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

export type RootStackParamList = {
  MainTabs: undefined;
  AddAccount: undefined;
  AddTransaction: undefined;
};

export type MainTabsParamList = {
  Holdings: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Settings: undefined;
};

export type AccountsStackParamList = {
  AccountList: undefined;
  AccountDetail: { accountId: string };
};

export type HoldingsStackParamList = {
  HoldingsOverview: undefined;
  AssetDetail: { market: Market; symbol: string };
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

// Accounts screens live in a native-stack nested inside the Accounts tab.
// CompositeScreenProps lets them navigate both within AccountsStack and up to
// the Root stack (e.g. the AddAccount modal).
export type AccountsStackScreenProps<T extends keyof AccountsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AccountsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Holdings screens mirror the Accounts pattern (list → detail in-tab stack,
// can also reach the Root modal group, e.g. AddTransaction).
export type HoldingsStackScreenProps<T extends keyof HoldingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HoldingsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;
