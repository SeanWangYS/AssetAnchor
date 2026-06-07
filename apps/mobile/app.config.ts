import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AssetAnchor',
  slug: 'assetanchor',
  scheme: 'assetanchor',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.seanwangys.assetanchor',
    googleServicesFile: './.secrets/GoogleService-Info.plist',
  },
  android: { package: 'com.seanwangys.assetanchor' },
  plugins: [
    // expo-build-properties 必須是第一個 plugin（對齊 mikehardy/rnfbdemo demonstrator 的順序）。
    // forceStaticLinking 要列出每個有 native pod 的 RNFB 套件，否則 SDK54 / RN0.81 + useFrameworks
    // static 下，RNFB 的 ObjC header 會撞 Clang modules ownership 錯誤（RCTBridgeModule must be
    // imported from module 'RNFBApp.RNFBAppModule' before it is required）、RCTPromiseRejectBlock
    // 解析不到。ref: invertase/react-native-firebase#8657、expo/expo#39607
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          forceStaticLinking: ['RNFBApp', 'RNFBAuth', 'RNFBFirestore'],
        },
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.269986802776-78inqssl5jfl12d1qvnth7oruj0hm6mi',
      },
    ],
  ],
};

export default config;
