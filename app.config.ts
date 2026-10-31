import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BLUE Mobile',
  slug: 'blue-mobile',
  version: '0.1.0',
  orientation: 'default',
  scheme: 'bluemobile',
  userInterfaceStyle: 'light',
  icon: './src/shared/assets/app/icon.png',
  android: {
    package: 'vn.blue.mobile',
    adaptiveIcon: {
      foregroundImage: './src/shared/assets/app/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Cho phép BLUE dùng vị trí để hiển thị thời tiết.',
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
  ],
});
