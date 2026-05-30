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
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.269986802776-78inqssl5jfl12d1qvnth7oruj0hm6mi',
      },
    ],
  ],
};

export default config;
