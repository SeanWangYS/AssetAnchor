import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import AddAccountScreen from '../../features/accounts/screens/AddAccountScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root native-stack：登入後的 MainTabs + 共用 Modal group（D2）。
 * Sprint 3 的 AddTransaction / EditTransaction 會掛進同一個 Modal group。
 */
export default function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Group screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Group>
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="AddAccount"
          component={AddAccountScreen}
          options={{ title: '新增帳戶' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
