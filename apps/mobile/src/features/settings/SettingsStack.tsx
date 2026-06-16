import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../core/navigation/types';
import SettingsScreen from './SettingsScreen';
import DisplayPrefsScreen from './screens/DisplayPrefsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AboutScreen from './screens/AboutScreen';
import AccountsStack from '../accounts/AccountsStack';
import { colors } from '../../core/theme';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

/**
 * 設定 in-tab stack（design.md §1）：SettingsHome（分組清單）+ 帳戶管理子頁
 * （掛載整個 AccountsStack 作為一個 screen）+ 顯示偏好 / 個人資料 / 關於佔位頁。
 *
 * 帳戶從 tab 降為設定子頁；AccountsStack 自帶 header，故 `Accounts` 這個 screen 關掉 stack header
 * 避免雙 header（依賴方向仍是 features → core，巢狀 navigator mount 不算 feature 互 import）。
 */
export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.screen },
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: '設定' }} />
      <Stack.Screen
        name="Accounts"
        component={AccountsStack}
        options={{ headerShown: false, title: '帳戶管理' }}
      />
      <Stack.Screen
        name="DisplayPrefs"
        component={DisplayPrefsScreen}
        options={{ title: '顯示偏好' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '個人資料' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: '關於' }} />
    </Stack.Navigator>
  );
}
