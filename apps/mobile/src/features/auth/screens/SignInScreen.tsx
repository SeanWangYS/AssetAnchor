import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { signInWithEmail } from '../authService';

export default function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    setBusy(true);
    setError(null);
    const res = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.errorMessage ?? '登入失敗');
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>登入</Text>
      <TextInput
        style={styles.in}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.in}
        placeholder="密碼"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.err}>{error}</Text>}
      <Button title={busy ? '登入中…' : '登入'} onPress={onSignIn} disabled={busy} />
      <Button title="還沒有帳號？註冊" onPress={() => navigation.navigate('SignUp')} />
      <Button title="忘記密碼" onPress={() => navigation.navigate('ForgotPassword')} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  err: { color: 'red' },
});
