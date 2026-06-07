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

export type MainTabsParamList = {
  Holdings: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Settings: undefined;
};
/* eslint-enable @typescript-eslint/consistent-type-definitions */

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
export type MainTabsScreenProps<T extends keyof MainTabsParamList> = BottomTabScreenProps<
  MainTabsParamList,
  T
>;
