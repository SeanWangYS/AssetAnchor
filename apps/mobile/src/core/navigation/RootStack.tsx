import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import AddAccountScreen from '../../features/accounts/screens/AddAccountScreen';
import AddTransactionScreen from '../../features/transactions/screens/AddTransactionScreen';
import DateRangeSheetScreen from '../../features/transactions/screens/DateRangeSheetScreen';
import { colors } from '../theme';
import { zhTW } from '../../i18n/zh-TW';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root native-stack：登入後的 MainTabs + 共用 Modal group（design.md §1）。
 * - AddTransaction：持倉 header ＋ / AssetDetail / 交易 FAB 共用 sheet。
 * - EditTransaction：reuse AddTransaction 同 sheet（標題改「編輯交易」）；Phase 4 接表單帶值。
 * - AddAccount：帳戶 FAB。
 * - DateRange：期間篩選 sheet（reserved）。
 */
export default function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Group screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Group>
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.screen },
        }}
      >
        <Stack.Screen
          name="AddAccount"
          component={AddAccountScreen}
          options={{ title: '新增帳戶' }}
        />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{ title: zhTW.transactions.addTitle }}
        />
        <Stack.Screen
          name="EditTransaction"
          component={AddTransactionScreen}
          options={{ title: '編輯交易' }}
        />
        <Stack.Screen
          name="DateRange"
          component={DateRangeSheetScreen}
          options={{ title: '期間篩選' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
