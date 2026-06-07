import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUserDoc } from '../auth/userDoc';

export default function HoldingsScreen() {
  const [railEmail, setRailEmail] = useState<string>('讀取中…');

  useEffect(() => {
    void getUserDoc().then((d) => setRailEmail(d ? `rail OK → ${d.email}` : '（查無 user doc）'));
  }, []);

  return (
    <View style={styles.c}>
      <Text style={styles.t}>持倉</Text>
      <Text>{railEmail}</Text>
      <Text>Sprint 3 填入持倉清單</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
