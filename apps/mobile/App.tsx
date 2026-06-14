import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, wireEmulatorsOnce } from './src/services/firebase';
import { useAuthStore } from './src/features/auth/authStore';
import { useAccountsStore } from './src/features/accounts/accountsStore';
import { useTransactionsStore } from './src/features/transactions/transactionsStore';
import { useExchangeRatesStore } from './src/services/exchange-rates';
import RootNavigator from './src/core/navigation/RootNavigator';

GoogleSignin.configure({ webClientId: 'autoDetect' });

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    wireEmulatorsOnce();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      const accounts = useAccountsStore.getState();
      const transactions = useTransactionsStore.getState();
      const exchangeRates = useExchangeRatesStore.getState();
      if (user) {
        accounts.subscribe(user.uid);
        transactions.subscribe(user.uid);
        exchangeRates.subscribe();
      } else {
        accounts.stop();
        transactions.stop();
        exchangeRates.stop();
      }
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
