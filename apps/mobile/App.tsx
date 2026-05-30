import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { sanityCheck } from './src/sanity';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AssetAnchor</Text>
      <Text>shared wiring OK → Money.zero(&apos;TWD&apos;) = {sanityCheck()}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: '600' },
});
