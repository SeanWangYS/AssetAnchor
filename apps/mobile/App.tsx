import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { auth, wireEmulatorsOnce } from './src/services/firebase';
import { useAuthStore } from './src/features/auth/authStore';
import RootNavigator from './src/core/navigation/RootNavigator';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    wireEmulatorsOnce();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
