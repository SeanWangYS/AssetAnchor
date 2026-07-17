import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../core/navigation/types';
import TransactionsScreen from './TransactionsScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import { colors } from '../../core/theme';
import { zhTW } from '../../i18n/zh-TW';

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
        // headerShown:false 仍需 title：native-stack 以此作為子頁返回鈕文字，
        // 缺 title 會裸露 route 名「TransactionList」（visual-audit P1-5；同 HoldingsStack 慣例）
        options={{ headerShown: false, title: zhTW.transactions.listTitle }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: '交易詳情' }}
      />
    </Stack.Navigator>
  );
}
