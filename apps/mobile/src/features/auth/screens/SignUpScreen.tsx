import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { signUpWithEmail } from '../authService';

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignUp() {
    setBusy(true);
    setError(null);
    const res = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.errorMessage ?? '註冊失敗');
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>註冊</Text>
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
        placeholder="密碼（至少 6 碼）"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.err}>{error}</Text>}
      <Button title={busy ? '註冊中…' : '註冊'} onPress={onSignUp} disabled={busy} />
      <Button title="已有帳號？回登入" onPress={() => navigation.goBack()} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  err: { color: 'red' },
});
