import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { sendPasswordReset } from '../authService';

export default function ForgotPasswordScreen({
  navigation,
}: AuthStackScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onReset() {
    setBusy(true);
    setMsg(null);
    const res = await sendPasswordReset(email.trim());
    setBusy(false);
    setMsg(res.ok ? '重設密碼信已寄出，請查收。' : (res.errorMessage ?? '寄送失敗'));
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>忘記密碼</Text>
      <TextInput
        style={styles.in}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {msg && <Text>{msg}</Text>}
      <Button title={busy ? '寄送中…' : '寄送重設信'} onPress={onReset} disabled={busy} />
      <Button title="回登入" onPress={() => navigation.goBack()} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
});
