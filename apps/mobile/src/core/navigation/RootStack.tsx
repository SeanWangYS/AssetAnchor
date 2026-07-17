import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import AddAccountScreen from '../../features/accounts/screens/AddAccountScreen';
import AddTransactionScreen from '../../features/transactions/screens/AddTransactionScreen';
import DateRangeSheetScreen from '../../features/transactions/screens/DateRangeSheetScreen';
import { colors } from '../theme';
import { zhTW } from '../../i18n/zh-TW';

/** 取消鈕文字樣式（headerLeft；模組層 const 避免每 render 重建）。 */
const headerCancelStyle = { color: colors.textSecondary, fontSize: 15 } as const;

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
          options={({ navigation }) => ({
            title: '新增帳戶',
            // P3-12：modal 需明示關閉（原型表單 header＝左取消；沿 headerLeft 慣例）。
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="取消"
                hitSlop={8}
                onPress={() => navigation.goBack()}
              >
                <Text style={headerCancelStyle}>取消</Text>
              </Pressable>
            ),
          })}
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
