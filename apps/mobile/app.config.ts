import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AssetAnchor',
  slug: 'assetanchor',
  scheme: 'assetanchor',
  version: '0.0.1',
  // App icon（owner 2026-07-07 拍板 v2：深色底＋accent 紫錨形標誌＋柔光，幾何取自 app 內品牌
  // 標誌 core/ui/AALogoMark.tsx——桌面 icon 與 in-app 品牌識別統一）。iOS icon 需不透明背景。
  icon: './assets/icon.png',
  orientation: 'portrait',
  // 設計包是 dark-first（design.md §3 / D4）；MVP 不做 light theme。
  userInterfaceStyle: 'dark',
  // New Architecture (Fabric/Bridgeless) iOS TextInput 曾出現「focus 後立即失焦、鍵盤打不進、
  // 僅 paste 有效」。根因為 Fabric view-flattening：core/ui/Input.tsx 在 focus 時套 focusRing
  // 陰影，觸發該 view 的 remove+insert 致內層 TextInput 失焦（RN #45798）。已於 Input.tsx 加
  // collapsable={false} 修正，故維持新架構啟用（與 SDK 54 預設一致，避免 Paper 技術債）。詳見 ADR-0009。
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.seanwangys.assetanchor',
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './.secrets/GoogleService-Info.plist',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
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
    // expo-font config plugin：讓字型在 prebuild 時被打包進 native bundle（@expo-google-fonts
    // 在 dev 走 runtime asset、prod build 由此 plugin 嵌入）。
    'expo-font',
  ],
  extra: {
    eas: {
      projectId: '2d013228-6e12-435f-8a92-4cfac4542d5e',
    },
  },
};

export default config;
