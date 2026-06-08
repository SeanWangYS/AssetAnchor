import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AccountsStackParamList } from '../../core/navigation/types';
import AccountListScreen from './screens/AccountListScreen';
import AccountDetailScreen from './screens/AccountDetailScreen';

const Stack = createNativeStackNavigator<AccountsStackParamList>();

export default function AccountsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AccountList" component={AccountListScreen} options={{ title: '帳戶' }} />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{ title: '帳戶詳情' }}
      />
    </Stack.Navigator>
  );
}
