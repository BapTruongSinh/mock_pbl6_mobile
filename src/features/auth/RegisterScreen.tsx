/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type KeyboardTypeOptions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { authStyles as shared } from './auth.styles';
import { registerStyles as styles } from './register.styles';
import { useRegisterForm, type RegisterValues } from './useRegisterForm';
import { colors } from '../../shared/theme/tokens';

const assets = {
  logo: require('../../shared/assets/register/brand-blue.png') as number,
  fullName: require('../../shared/assets/register/full-name.svg') as number,
  phone: require('../../shared/assets/register/phone.svg') as number,
  email: require('../../shared/assets/register/email.svg') as number,
  password: require('../../shared/assets/register/password.svg') as number,
  eye: require('../../shared/assets/register/show-password.svg') as number,
  facebook: require('../../shared/assets/register/facebook.svg') as number,
  google: require('../../shared/assets/register/google.svg') as number,
};
function AssetIcon({ source, size = 20 }: { source: number; size?: number }): React.ReactElement {
  return <SvgUri uri={Image.resolveAssetSource(source).uri} width={size} height={size} />;
}
const fields: {
  key: keyof RegisterValues;
  label: string;
  placeholder: string;
  keyboard?: KeyboardTypeOptions;
  secure?: boolean;
  icon: number;
}[] = [
  { key: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn An', icon: assets.fullName },
  {
    key: 'phone',
    label: 'Số điện thoại',
    placeholder: '0901 234 567',
    keyboard: 'phone-pad',
    icon: assets.phone,
  },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'ten@email.com',
    keyboard: 'email-address',
    icon: assets.email,
  },
  {
    key: 'password',
    label: 'Mật khẩu',
    placeholder: '••••••••••',
    secure: true,
    icon: assets.password,
  },
  {
    key: 'confirmPassword',
    label: 'Xác nhận mật khẩu',
    placeholder: '••••••••••',
    secure: true,
    icon: assets.password,
  },
];
export function RegisterScreen({
  onNavigateToLogin,
}: {
  onNavigateToLogin?: () => void;
}): React.ReactElement {
  const form = useRegisterForm();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, Math.min(480, width - insets.left - insets.right - 32) - 48);
  const reflow = contentWidth < 310 || fontScale > 1;
  const fullWidth = { width: '100%' as const };
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <SafeAreaView style={shared.container} testID="screen.FIGMA-64-638">
      <KeyboardAvoidingView
        style={shared.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={shared.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={shared.card} testID="auth.register.form">
            <Image
              source={assets.logo}
              style={shared.brandLogo}
              resizeMode="contain"
              accessibilityLabel="Logo chính thức BLUE"
              accessibilityRole="image"
            />
            <Text style={[styles.title, fullWidth, reflow && styles.reflowTitle]}>
              Tạo tài khoản BLUE.
            </Text>
            <Text style={[styles.subtitle, fullWidth]}>Chỉ mất một phút để hoàn tất</Text>
            <View style={[styles.socialRow, fullWidth, reflow && styles.reflowSocial]}>
              {(['facebook', 'google'] as const).map((provider) => (
                <Pressable
                  key={provider}
                  style={[styles.socialButton, reflow && styles.reflowButton]}
                  accessibilityRole="button"
                  accessibilityLabel={`Đăng ký bằng ${provider === 'facebook' ? 'Facebook' : 'Google'}`}
                  onPress={() => setNotice('Đăng ký mạng xã hội đang được mô phỏng.')}
                >
                  <AssetIcon source={assets[provider]} />
                  <Text style={styles.socialText}>
                    {provider === 'facebook' ? 'Facebook' : 'Google'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.divider, fullWidth]}>
              <View style={shared.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={shared.dividerLine} />
            </View>
            {fields.map((field, index) => (
              <View
                key={field.key}
                style={[
                  styles.field,
                  fullWidth,
                  index === fields.length - 1 && styles.lastField,
                  reflow && styles.reflowField,
                ]}
                testID={`auth.register.${field.key}Field`}
              >
                <Text style={[styles.label, reflow && styles.reflowLabel]}>{field.label}</Text>
                <View style={styles.inputRow}>
                  <AssetIcon source={field.icon} />
                  <TextInput
                    style={styles.input}
                    testID={`auth.register.${field.key}`}
                    value={form.values[field.key]}
                    onChangeText={(value) => form.update(field.key, value)}
                    accessibilityLabel={field.label}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textPrimary}
                    autoCapitalize={field.key === 'fullName' ? 'words' : 'none'}
                    autoCorrect={false}
                    keyboardType={field.keyboard}
                    secureTextEntry={Boolean(field.secure && !visiblePasswords[field.key])}
                  />
                  {field.secure && (
                    <Pressable
                      style={styles.eye}
                      testID={`auth.register.toggle.${field.key}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${visiblePasswords[field.key] ? 'Ẩn' : 'Hiện'} ${field.label.toLowerCase()}`}
                      onPress={() =>
                        setVisiblePasswords((previous) => ({
                          ...previous,
                          [field.key]: !previous[field.key],
                        }))
                      }
                    >
                      <AssetIcon source={assets.eye} size={19} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            <Pressable
              style={[styles.terms, fullWidth]}
              testID="auth.register.terms"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.acceptedTerms }}
              accessibilityLabel="Tôi đồng ý Điều khoản và Chính sách bảo mật"
              onPress={form.toggleTerms}
            >
              <View
                style={[
                  shared.checkboxBox,
                  { marginRight: 0 },
                  form.acceptedTerms && shared.checkboxChecked,
                ]}
              >
                {form.acceptedTerms && <Text style={shared.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>Tôi đồng ý Điều khoản và Chính sách bảo mật.</Text>
            </Pressable>
            {form.error && (
              <Text
                accessibilityRole="alert"
                style={[styles.message, { color: colors.danger }]}
                testID="auth.register.error"
              >
                {form.error}
              </Text>
            )}
            {notice && (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{notice}</Text>
            )}
            {form.success && (
              <Text
                accessibilityRole="alert"
                style={[styles.message, { color: colors.success }]}
                testID="auth.register.success"
              >
                Tạo tài khoản thành công. Bạn có thể tiếp tục sử dụng tài khoản này.
              </Text>
            )}
            <Pressable
              style={[
                shared.submitButton,
                fullWidth,
                { marginBottom: 0 },
                form.isLoading && shared.submitButtonDisabled,
              ]}
              testID="auth.register.submit"
              accessibilityRole="button"
              accessibilityState={{ disabled: form.isLoading || form.success }}
              disabled={form.isLoading || form.success}
              onPress={() => void form.submit()}
            >
              <Text style={shared.submitButtonText}>
                {form.isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.loginLink, fullWidth]}
              accessibilityRole="button"
              testID="auth.register.login"
              onPress={onNavigateToLogin}
            >
              <Text style={shared.registerPrompt}>Đã có tài khoản?</Text>
              <Text style={shared.registerAction}>Đăng nhập</Text>
            </Pressable>
            <Text style={[shared.footerText, fullWidth, styles.footer]}>
              Điều khoản dịch vụ · Chính sách bảo mật
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
