import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../core/navigation/types';
import TransactionsScreen from './TransactionsScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import { colors } from '../../core/theme';

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

/**
 * 交易 in-tab stack（design.md §1）：TransactionList（既有 TransactionsScreen，時間軸）
 * → TransactionDetail（檢視/編輯/刪除）。新增交易入口 = FAB only（header ＋ 已移除）。
 * dark header 對齊 §3。
 */
export default function TransactionsStack() {
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
        name="TransactionList"
        component={TransactionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: '交易詳情' }}
      />
    </Stack.Navigator>
  );
}
