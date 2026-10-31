import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoLegacyFileSystem from 'expo-file-system/legacy';
import { colors, spacing, typography } from '../shared/theme/tokens';
import {
  getNativeFoundationFault,
  subscribeNativeFoundationFault,
  getNativeHarnessHideBars,
  subscribeNativeHarnessBars,
} from '../testing/nativeHarness';
import { subscribeScenarioLaunch } from '../testing/scenarios/registry';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_BLUE_LOGO = require('../shared/assets/brand-blue-logo.png') as number;

function persistNativeLayoutTelemetry(layouts: Record<string, LayoutRectangle>): void {
  if (
    typeof ExpoLegacyFileSystem.documentDirectory !== 'string' ||
    ExpoLegacyFileSystem.documentDirectory.trim().length === 0
  ) {
    return;
  }
  const dir = ExpoLegacyFileSystem.documentDirectory.endsWith('/')
    ? ExpoLegacyFileSystem.documentDirectory
    : `${ExpoLegacyFileSystem.documentDirectory}/`;
  const target = `${dir}foundation-onlayout.json`;
  void ExpoLegacyFileSystem.writeAsStringAsync(
    target,
    JSON.stringify({ updatedAt: Date.now(), layouts }, null, 2),
  ).catch(() => undefined);
}

export function FoundationBootstrapView(): React.ReactElement {
  const [touched, setTouched] = useState(false);
  const [launchGeneration, setLaunchGeneration] = useState(0);
  const [hideBars, setHideBars] = useState(getNativeHarnessHideBars);
  useEffect(() => subscribeNativeHarnessBars(setHideBars), []);
  const [nativeFault, setNativeFault] = useState(getNativeFoundationFault);
  useEffect(() => subscribeNativeFoundationFault(setNativeFault), []);
  const layoutsRef = useRef<Record<string, LayoutRectangle>>({});

  useEffect(() => {
    return subscribeScenarioLaunch((caseId) => {
      if (caseId === 'FOUNDATION-SMOKE') {
        setTouched(false);
        setLaunchGeneration((value) => value + 1);
      }
    });
  }, []);

  const recordLayout = useCallback(
    (id: string) => (event: LayoutChangeEvent) => {
      layoutsRef.current[id] = event.nativeEvent.layout;
      persistNativeLayoutTelemetry(layoutsRef.current);
    },
    [],
  );

  return (
    <SafeAreaView
      key={launchGeneration}
      edges={hideBars ? [] : ['top', 'right', 'bottom', 'left']}
      style={styles.container}
      testID="screen.FOUNDATION-SMOKE"
      collapsable={false}
      onLayout={recordLayout('screen.FOUNDATION-SMOKE')}
    >
      <View
        style={[styles.anchorBox, nativeFault === 'anchor-offset' && { marginLeft: 28 }]}
        testID="foundation.anchor"
        collapsable={false}
        accessibilityRole="summary"
        accessibilityLabel="Khung chuẩn hiệu chỉnh 100 nhân 50"
        onLayout={recordLayout('foundation.anchor')}
      >
        <Image
          source={BRAND_BLUE_LOGO}
          style={styles.logo}
          resizeMode="contain"
          testID="foundation.logo"
          accessibilityRole="image"
          accessibilityLabel="Logo chính thức BLUE"
          onLayout={recordLayout('foundation.logo')}
        />
      </View>

      <View
        style={[
          styles.content,
          nativeFault === 'overlap' && { position: 'absolute', top: 20, left: 20, paddingTop: 0 },
        ]}
        collapsable={false}
      >
        <Text
          style={styles.statusText}
          testID="foundation.status"
          accessibilityRole="text"
          accessibilityLabel={touched ? 'Đã chạm' : 'Sẵn sàng'}
          onLayout={recordLayout('foundation.status')}
        >
          {touched ? 'Đã chạm' : 'Sẵn sàng'}
        </Text>

        <Pressable
          style={[
            styles.toggleButton,
            nativeFault === 'overlap' && { position: 'absolute', top: 0 },
          ]}
          testID="foundation.toggle"
          collapsable={false}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={nativeFault === 'missing-label' ? '' : 'Kiểm tra'}
          onLayout={recordLayout('foundation.toggle')}
          onPress={() => setTouched(true)}
        >
          <Text style={styles.toggleButtonText}>
            {nativeFault === 'missing-label' ? '' : 'Kiểm tra'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  anchorBox: {
    marginLeft: spacing.xl,
    marginTop: spacing.xl,
    width: 100,
    height: 50,
    backgroundColor: colors.guestButtonBg,
    borderColor: colors.borderSocial,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 84,
    height: 26,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  statusText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.subtitle,
  },
  toggleButton: {
    minWidth: 120,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.ctaPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  toggleButtonText: {
    color: colors.ctaPrimaryText,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
});
