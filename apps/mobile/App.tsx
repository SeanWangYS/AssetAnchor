import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, wireEmulatorsOnce } from './src/services/firebase';
import { initErrorReporting } from './src/services/monitoring';
import { useAuthStore } from './src/features/auth/authStore';
import { getUserDoc } from './src/features/auth/userDoc';
import { useAccountsStore } from './src/features/accounts/accountsStore';
import { useTransactionsStore } from './src/features/transactions/transactionsStore';
import { useExchangeRatesStore } from './src/services/exchange-rates';
import { usePreferencesStore } from './src/services/preferences';
import RootNavigator from './src/core/navigation/RootNavigator';
import SplashGate from './src/core/navigation/SplashGate';
import { fontMap, useFonts } from './src/core/theme/fonts';

// webClientId 必須是 Firebase 專案的 Web OAuth client（GIDSignIn 將其當 token 交換的
// audience）；裝的 v16 不支援新版的 'autoDetect' 哨兵值——字面值會被原樣送給 Google，
// token 交換回 AppAuth 不認得的 OAuth 錯誤（-61440 OIDErrorCodeOAuthOther）。
GoogleSignin.configure({
  webClientId: '269986802776-ruvb9c520d4osm0p3091kuueeogiis9a.apps.googleusercontent.com',
});

// 錯誤上報（Sentry，add-sentry-error-reporting）：模組載入即 init，涵蓋啟動期錯誤。
// dev / Emulator 模式 / 缺 DSN 時為 no-op（見 services/monitoring）。
initErrorReporting();

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  // 字型載入前不渲染畫面，避免 fallback 字型閃動；等待態與 RootNavigator 的 auth-resolving
  // 共用同一個 SplashGate 視覺（品牌閘門）。
  const [fontsLoaded] = useFonts(fontMap);

  useEffect(() => {
    wireEmulatorsOnce();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      const accounts = useAccountsStore.getState();
      const transactions = useTransactionsStore.getState();
      const exchangeRates = useExchangeRatesStore.getState();
      const preferences = usePreferencesStore.getState();
      if (user) {
        accounts.subscribe(user.uid);
        transactions.subscribe(user.uid);
        exchangeRates.subscribe();
        // 顯示偏好：登入後一次性灌入（holdings 合計 / analysis 預設讀此 store）。
        void getUserDoc().then((doc) => preferences.hydrate(doc));
      } else {
        accounts.stop();
        transactions.stop();
        exchangeRates.stop();
        preferences.reset();
      }
    });
    return unsubscribe;
  }, [setUser]);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SplashGate />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
