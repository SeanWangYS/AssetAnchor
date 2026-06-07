import { Button, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../auth/authService';

export default function SettingsScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>設定</Text>
      <Button
        title="登出"
        onPress={() => {
          void signOut();
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
