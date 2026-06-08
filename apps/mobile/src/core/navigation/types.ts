import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

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

// Accounts screens live in a native-stack nested inside the Accounts tab.
// CompositeScreenProps lets them navigate both within AccountsStack and up to
// the Root stack (e.g. the AddAccount modal).
export type AccountsStackScreenProps<T extends keyof AccountsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AccountsStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;
