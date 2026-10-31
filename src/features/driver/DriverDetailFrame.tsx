import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { driverStyles as s } from './driver.styles';
import { driverDetailAssets } from './driverDetailAssets';
export type DriverDetailTab = 'home' | 'route' | 'scan' | 'account';
export function DetailAsset({
  node,
  name,
  size = 18,
  height = size,
}: {
  node: string;
  name: string;
  size?: number;
  height?: number;
}): React.ReactElement {
  return (
    <Image
      source={driverDetailAssets[node]?.[name]}
      resizeMode="contain"
      style={{ width: size, height }}
    />
  );
}
export function DriverDetailFrame({
  node,
  subtitle,
  onBack,
  onNavigate,
  onLongPress,
  children,
  title = 'Thông tin chuyến',
  assetMap = driverDetailAssets,
  hideNavigation = false,
  activeTab = 'route',
}: {
  node: string;
  subtitle: string;
  onBack: () => void;
  onNavigate: (tab: DriverDetailTab) => void;
  onLongPress: () => void;
  children: React.ReactNode;
  title?: string;
  assetMap?: Record<string, Record<string, number>>;
  hideNavigation?: boolean;
  activeTab?: DriverDetailTab;
}): React.ReactElement {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.root} testID={`screen.driverDetail.${node.replace(':', '-')}`}>
      <StatusBar barStyle="light-content" />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="detailSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4063E0" />
              <Stop offset="0.23" stopColor="#809CFA" />
              <Stop offset="0.47" stopColor="#E8F0FF" />
              <Stop offset="0.68" stopColor="#FBFCFF" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#detailSky)" />
        </Svg>
        <View
          style={{ position: 'absolute', left: width / 2 - 195, top: 0, width: 390, height: 844 }}
        >
          {[
            ['imgBackgroundBlueGlow', 28, -134, 344, 304],
            ['imgBackgroundWhiteGlow1', -143, 48, 321, 286],
            ['imgBackgroundWhiteGlow2', 206, 106, 314, 284],
            ['imgBackgroundWhiteGlow3', -2, 487, 401, 306],
          ].map(([name, left, top, w, h]) => (
            <Image
              key={name}
              source={assetMap[node]?.[String(name)]}
              resizeMode="contain"
              style={{
                position: 'absolute',
                left: Number(left),
                top: Number(top),
                width: Number(w),
                height: Number(h),
              }}
            />
          ))}
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <View style={s.content}>
            <View style={s.header}>
              <Pressable
                testID="driver.detail.back"
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={onBack}
                style={s.back}
              >
                <Image
                  source={assetMap[node]?.imgIconBack}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                />
              </Pressable>
              <Pressable
                style={{ flex: 1 }}
                testID="driver.detail.title"
                onLongPress={onLongPress}
                accessibilityRole="header"
              >
                <Text style={s.headerTitle}>{title}</Text>
              </Pressable>
              <Image
                source={assetMap[node]?.imgIconShield}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text style={s.date}>{subtitle}</Text>
            <View
              style={[
                s.body,
                { minHeight: Math.max(510, height - insets.top - insets.bottom - 200), gap: 12 },
              ]}
            >
              {children}
            </View>
          </View>
        </ScrollView>
        {!hideNavigation && (
          <View style={s.navWrap}>
            <View style={s.nav}>
              {(
                [
                  ['home', 'Hôm nay', 'imgIconHome'],
                  ['route', 'Lộ trình', 'imgIconRoute'],
                  [
                    'account',
                    'Tài khoản',
                    assetMap[node]?.imgIconUser1 ? 'imgIconUser1' : 'imgIconUser',
                  ],
                ] as const
              ).map(([value, label, icon]) => (
                <Pressable
                  key={value}
                  testID={`driver.detail.tab.${value}`}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: value === activeTab }}
                  onPress={() => onNavigate(value)}
                  style={s.navItem}
                >
                  <View style={[s.navIcon, value === activeTab && s.navActive]}>
                    <Image
                      source={assetMap[node]?.[icon]}
                      style={{ width: 20, height: 20 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[s.navText, value === activeTab && s.navTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
