import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../theme';

/**
 * AALogoMark —— 圓環錨點標誌（aa-auth.jsx:15 `AAMark` / 38 `AALogoMark`），react-native-svg 自繪。
 * 漸層描邊跟隨主題 accent（`userSpaceOnUse`，純直/橫線段才吃漸層）。
 * `glow`：標誌後柔光圈（RN 以圓形陰影 View 近似 prototype 的 radial blur）。
 *
 * 幾何忠實移植 viewBox 0 0 48 48：頂環 + 主幹 + 橫桿 + 錨弧 + 兩側錨爪。
 */
interface AALogoMarkProps {
  size?: number;
  glow?: boolean;
  /** 覆寫 accent（預設跟隨 theme）。 */
  color?: string;
}

export default function AALogoMark({
  size = 64,
  glow = true,
  color = colors.accent,
}: AALogoMarkProps) {
  const gid = useId();
  const stroke = `url(#${gid})`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: size,
              shadowColor: color,
              shadowRadius: size * 0.4,
            },
          ]}
        />
      ) : null}
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={gid} gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="42" y2="44">
            <Stop offset="0%" stopColor={color} stopOpacity={0.82} />
            <Stop offset="100%" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle
          cx="24"
          cy="11"
          r="5.2"
          fill="none"
          stroke={stroke}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M24 16.2 V41"
          fill="none"
          stroke={stroke}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M14.5 25.5 H33.5"
          fill="none"
          stroke={stroke}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 31 C10 38.4 16 42.4 24 42.4 C32 42.4 38 38.4 39 31"
          fill="none"
          stroke={stroke}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 31 L6.2 36.2 M9 31 L14.4 33.2"
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M39 31 L41.8 36.2 M39 31 L33.6 33.2"
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
  },
});
