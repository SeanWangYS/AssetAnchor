import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AnalysisStackParamList } from '../../core/navigation/types';
import AnalysisOverviewScreen from './screens/AnalysisOverviewScreen';
import { colors } from '../../core/theme';

const Stack = createNativeStackNavigator<AnalysisStackParamList>();

/**
 * 分析 in-tab stack（design.md §1）：目前單頁 AnalysisOverview。
 * dark header（對齊 §3 page 底色），無新增交易入口（分析頁靜態）。
 */
export default function AnalysisStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.screen },
      }}
    >
      <Stack.Screen
        name="AnalysisOverview"
        component={AnalysisOverviewScreen}
        options={{ title: '分析' }}
      />
    </Stack.Navigator>
  );
}
