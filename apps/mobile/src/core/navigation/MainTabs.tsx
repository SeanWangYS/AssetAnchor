import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from './types';
import HoldingsScreen from '../../features/holdings/HoldingsScreen';
import TransactionsScreen from '../../features/transactions/TransactionsScreen';
import AccountsStack from '../../features/accounts/AccountsStack';
import SettingsScreen from '../../features/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Holdings" component={HoldingsScreen} options={{ title: '持倉' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: '交易' }} />
      <Tab.Screen
        name="Accounts"
        component={AccountsStack}
        options={{ title: '帳戶', headerShown: false }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}
