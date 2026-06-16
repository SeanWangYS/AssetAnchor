import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../../features/auth/authStore';
import AuthStack from './AuthStack';
import RootStack from './RootStack';
import SplashGate from './SplashGate';

/**
 * RootNavigator —— 依 auth 狀態切換（design.md §1 Auth）：
 * - status === 'loading'（auth 狀態解析中）→ SplashGate（品牌閘門，取代裸 ActivityIndicator）。
 * - 未登入 → AuthStack；已登入 → RootStack（落地 MainTabs → 持倉）。
 */
export default function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'loading') {
    return <SplashGate />;
  }

  return <NavigationContainer>{user ? <RootStack /> : <AuthStack />}</NavigationContainer>;
}
