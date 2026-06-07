import { StyleSheet, Text, View } from 'react-native';

export default function TransactionsScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>交易</Text>
      <Text>Sprint 3 填入</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
