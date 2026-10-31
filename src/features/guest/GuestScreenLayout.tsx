import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { guestStyles as styles } from './guest.styles';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../shared/assets/brand-blue-logo.png') as number;
export function GuestScreenLayout({
  children,
  title,
  subtitle,
  testID,
  onBack,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  testID: string;
  onBack?: () => void;
}): React.ReactElement {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.screen} testID={testID}>
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              { minHeight: Math.max(0, height - insets.top - insets.bottom - 40) },
            ]}
          >
            <Pressable
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              testID={`${testID}.back`}
              onPress={onBack}
            >
              <Text style={styles.backText}>Quay lại</Text>
            </Pressable>
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Logo chính thức BLUE"
            />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
            <Text style={styles.footer}>Điều khoản dịch vụ · Chính sách bảo mật</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
