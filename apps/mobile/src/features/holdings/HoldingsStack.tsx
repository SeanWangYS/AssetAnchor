import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HoldingsStackParamList } from '../../core/navigation/types';
import HoldingsOverviewScreen from './screens/HoldingsOverviewScreen';
import AssetDetailScreen from './screens/AssetDetailScreen';
import { zhTW } from '../../i18n/zh-TW';

const Stack = createNativeStackNavigator<HoldingsStackParamList>();

export default function HoldingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HoldingsOverview"
        component={HoldingsOverviewScreen}
        options={{ title: zhTW.holdings.title }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{ title: zhTW.holdings.detailTitle }}
      />
    </Stack.Navigator>
  );
}
