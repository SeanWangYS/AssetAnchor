import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../../core/navigation/types';
import AccountListScreen from './screens/AccountListScreen';
import AccountDetailScreen from './screens/AccountDetailScreen';
import { colors } from '../../core/theme';

const Stack = createNativeStackNavigator<AccountsStackParamList>();

/**
 * 帳戶 stack：AccountList → AccountDetail。
 * 現掛在 SettingsStack 之下作為子頁（design.md §1：帳戶不是 tab）。新增帳戶 = FAB（header ＋ 已移除）。
 * dark header 對齊 §3。
 */
export default function AccountsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.screen },
      }}
    >
      <Stack.Screen
        name="AccountList"
        component={AccountListScreen}
        options={{ title: '帳戶管理' }}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{ title: '帳戶詳情' }}
      />
    </Stack.Navigator>
  );
}
