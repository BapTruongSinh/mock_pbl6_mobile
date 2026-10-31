import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { typography } from '../../shared/theme/tokens';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hero = require('../../shared/assets/welcome/da-lat-journey.png') as number;
export function WelcomeScreen({ onStart }: { onStart?: () => void }): React.ReactElement {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground
      source={hero}
      resizeMode="cover"
      style={styles.root}
      testID="screen.FIGMA-650-4"
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="welcomeOverlay" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#030812" stopOpacity={0.62} />
              <Stop offset="0.36" stopColor="#030812" stopOpacity={0.04} />
              <Stop offset="0.67" stopColor="#030812" stopOpacity={0.24} />
              <Stop offset="1" stopColor="#030812" stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#welcomeOverlay)" />
        </Svg>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            minHeight: height,
            paddingTop: Math.max(78, insets.top + 24),
            paddingBottom: Math.max(46, insets.bottom + 16),
            paddingLeft: Math.max(24, insets.left + 16),
            paddingRight: Math.max(24, insets.right + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View>
            <Text style={styles.eyebrow}>CHÀO MỪNG</Text>
            <Text style={styles.title}>Mở lối hành trình</Text>
            <View style={styles.accent} />
          </View>
          <View style={styles.spacer} />
          <View style={styles.message}>
            <Text style={styles.headline}>Đi xa thật dễ.</Text>
            <Text style={styles.subtitle}>Tìm chuyến, chọn ghế và lên đường</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            testID="welcome.start"
            style={styles.button}
            onPress={onStart}
          >
            <Text style={styles.buttonText}>Bắt đầu hành trình</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A14' },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: 480 },
  eyebrow: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.8,
    textAlign: 'center',
    color: '#E0EBFF',
    marginBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  accent: {
    alignSelf: 'center',
    width: 54,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#296BF0',
    marginTop: 11,
  },
  spacer: { flex: 1, minHeight: 160 },
  message: { marginBottom: 85 },
  headline: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 7,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    color: '#E0EBFF',
    maxWidth: 306,
    alignSelf: 'center',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#296BF0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  buttonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});
