import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from './types';
import HoldingsStack from '../../features/holdings/HoldingsStack';
import TransactionsStack from '../../features/transactions/TransactionsStack';
import AnalysisStack from '../../features/analysis/AnalysisStack';
import SettingsStack from '../../features/settings/SettingsStack';
import { Icon } from '../ui';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabsParamList>();

/**
 * 底部 tab 恰好 4 個（design.md §1）：持倉 / 交易 / 分析 / 設定。帳戶不是 tab（降為設定子頁）。
 * 每個 tab 是各 feature 的 in-tab native-stack；tabBar 走 dark theme，圖示用 `core/ui` 的 1.8-stroke `Icon`。
 * 各 stack 自帶 header，故四個 tab 都 headerShown:false（避免雙 header）。
 */
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.page,
          borderTopColor: colors.divider,
        },
      }}
    >
      <Tab.Screen
        name="Holdings"
        component={HoldingsStack}
        options={{
          title: '持倉',
          tabBarIcon: ({ color, size }) => <Icon name="holdings" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{
          title: '交易',
          tabBarIcon: ({ color, size }) => <Icon name="txn" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisStack}
        options={{
          title: '分析',
          tabBarIcon: ({ color, size }) => <Icon name="analysis" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => <Icon name="settings" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
