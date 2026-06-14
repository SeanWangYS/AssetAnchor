import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HoldingsStackParamList } from '../../core/navigation/types';
import HoldingsOverviewScreen from './screens/HoldingsOverviewScreen';
import AssetDetailScreen from './screens/AssetDetailScreen';
import AssetTransactionsScreen from './screens/AssetTransactionsScreen';
import { colors } from '../../core/theme';
import { zhTW } from '../../i18n/zh-TW';

const Stack = createNativeStackNavigator<HoldingsStackParamList>();

/**
 * 持倉 in-tab stack（design.md §1，落地 tab）：HoldingsOverview → AssetDetail → AssetTransactions
 * （個股完整交易歷史）。持倉是唯一保留 header ＋ 的 tab（新增交易入口，在 HoldingsOverview 設定）。
 * dark header 對齊 §3。
 */
export default function HoldingsStack() {
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
        name="HoldingsOverview"
        component={HoldingsOverviewScreen}
        options={{ title: zhTW.holdings.title }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{ title: zhTW.holdings.detailTitle }}
      />
      <Stack.Screen
        name="AssetTransactions"
        component={AssetTransactionsScreen}
        options={{ title: zhTW.holdings.timeline.title }}
      />
    </Stack.Navigator>
  );
}
