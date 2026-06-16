/**
 * 字型載入 map —— 餵給 expo-font `useFonts()`。
 *
 * key（'Nunito_700Bold' 等）就是載入後可用的 font-family 名，必須與 `theme/index.ts`
 * 的 `fonts` / `fontFamily` 值一字不差對應。Nunito 取 500–900、Noto Sans TC 取 400–800（design.md §3）。
 *
 * 用法（App 啟動）：
 *   const [fontsLoaded] = useFonts(fontMap);
 *   if (!fontsLoaded) return <LoadingView/>;  // 字型載入前不渲染（避免 fallback 字閃動）
 */
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_600SemiBold,
  NotoSansTC_700Bold,
  NotoSansTC_800ExtraBold,
} from '@expo-google-fonts/noto-sans-tc';

/** 全部要載入的字型；key = 之後 style.fontFamily 引用的名稱。 */
export const fontMap = {
  // Nunito（數字 / 拉丁，500–900）
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  // Noto Sans TC（中文 / UI，400–800）
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_600SemiBold,
  NotoSansTC_700Bold,
  NotoSansTC_800ExtraBold,
} as const;

export { useFonts } from 'expo-font';
