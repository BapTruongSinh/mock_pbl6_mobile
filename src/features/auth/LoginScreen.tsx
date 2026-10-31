import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmailOrPhoneIcon,
  FacebookIcon,
  GoogleIcon,
  PasswordIcon,
  ShowPasswordIcon,
} from '../../shared/assets/icons/AuthIcons';
import { getNativeHarnessHideBars, subscribeNativeHarnessBars } from '../../testing/nativeHarness';
import { useSession } from './useSession';
import { authStyles as styles } from './auth.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_BLUE_LOGO = require('../../shared/assets/brand-blue-logo.png') as number;

export interface LoginScreenProps {
  onNavigateToRegister?: () => void;
  onNavigateToGuest?: () => void;
  onLoginSuccess?: (role: 'customer' | 'driver') => void;
}

export function LoginScreen({
  onNavigateToRegister,
  onNavigateToGuest,
  onLoginSuccess,
}: LoginScreenProps): React.ReactElement {
  const { login, isLoading } = useSession();
  const { width, height, fontScale, scale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  // Keep Figma metrics at 390/font1; narrower or enlarged text flows vertically.
  const availableWidth = Math.max(0, width - insets.left - insets.right);
  const formWidth = Math.max(0, Math.min(480, availableWidth - 32) - 48);
  const reflow = formWidth < 310 || fontScale > 1;
  const contentWidth = { width: formWidth };

  const [hideBars, setHideBars] = useState(getNativeHarnessHideBars);
  useEffect(() => {
    const unsubscribe = subscribeNativeHarnessBars(setHideBars);
    setHideBars(getNativeHarnessHideBars());
    return unsubscribe;
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [width, height, fontScale, hideBars]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'identifier' | 'password' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (isLoading) return;

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);

    const result = await login(trimmedIdentifier, password);
    if (!result.ok) {
      setErrorMessage(result.message || 'Tài khoản hoặc mật khẩu không chính xác');
    } else {
      onLoginSuccess?.(result.value.role);
    }
  };

  const handleSimulatedSocial = (provider: 'Facebook' | 'Google'): void => {
    setNoticeMessage(`Đăng nhập qua ${provider} đang được mô phỏng trong bản thử nghiệm.`);
  };

  const handleSimulatedForgot = (): void => {
    setNoticeMessage('Tính năng khôi phục mật khẩu đang được mô phỏng.');
  };

  return (
    <SafeAreaView
      edges={hideBars ? [] : ['top', 'right', 'bottom', 'left']}
      style={styles.container}
      testID="screen.FIGMA-64-634"
      collapsable={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          ref={scrollRef}
          testID={
            __DEV__
              ? `auth.login.profile.w${width}.f${fontScale}.bars${hideBars ? 0 : 1}.top${hideBars ? 0 : insets.top}`
              : undefined
          }
          key={`${width}:${height}:${scale}:${fontScale}:${hideBars}`}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card} testID="auth.login.form" collapsable={false}>
            <Image
              source={BRAND_BLUE_LOGO}
              style={styles.brandLogo}
              resizeMode="contain"
              testID="auth.login.brandLogo"
              accessibilityRole="image"
              accessibilityLabel="Logo chính thức BLUE"
            />

            <Text
              style={[styles.title, contentWidth, reflow && styles.titleReflow]}
              testID="auth.login.title"
            >
              Hành trình đang chờ bạn
            </Text>
            <Text style={[styles.subtitle, contentWidth]} testID="auth.login.subtitle">
              Đăng nhập để tiếp tục chuyến đi
            </Text>

            <View
              style={[styles.socialRow, contentWidth, reflow && styles.socialRowReflow]}
              testID="auth.login.socialRow"
              collapsable={false}
            >
              <Pressable
                style={[styles.socialButton, reflow && styles.socialButtonReflow]}
                testID="auth.login.socialFacebook"
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập bằng Facebook"
                collapsable={false}
                onPress={() => handleSimulatedSocial('Facebook')}
              >
                <View style={styles.socialIconContainer}>
                  <FacebookIcon size={20} />
                </View>
                <Text style={[styles.socialButtonText, reflow && styles.wrappingText]}>
                  Facebook
                </Text>
              </Pressable>

              <Pressable
                style={[styles.socialButton, reflow && styles.socialButtonReflow]}
                testID="auth.login.socialGoogle"
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập bằng Google"
                collapsable={false}
                onPress={() => handleSimulatedSocial('Google')}
              >
                <View style={styles.socialIconContainer}>
                  <GoogleIcon size={20} />
                </View>
                <Text style={[styles.socialButtonText, reflow && styles.wrappingText]}>Google</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.dividerContainer,
                contentWidth,
                reflow && styles.dividerReflow,
                reflow && { minHeight: Math.ceil(14 * fontScale) },
              ]}
              testID="auth.login.divider"
              collapsable={false}
            >
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email or Phone Input Container */}
            <View
              style={[
                styles.inputContainer,
                contentWidth,
                reflow && styles.inputContainerReflow,
                focusedInput === 'identifier' && styles.inputContainerFocused,
                Boolean(errorMessage) && styles.inputContainerError,
              ]}
              testID="auth.login.identifierField"
              collapsable={false}
            >
              <View style={[styles.floatingLabelContainer, reflow && styles.labelReflow]}>
                <Text style={styles.floatingLabelText}>Email hoặc số điện thoại</Text>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <EmailOrPhoneIcon size={20} />
                </View>
                <TextInput
                  style={[styles.textInput, reflow && styles.inputReflow]}
                  testID="auth.login.identifierInput"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedInput('identifier')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="nhap@email.com"
                  placeholderTextColor="#8793A3"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  accessibilityLabel="Email hoặc số điện thoại"
                />
              </View>
            </View>

            {/* Password Input Container */}
            <View
              style={[
                styles.inputContainer,
                contentWidth,
                reflow && styles.inputContainerReflow,
                focusedInput === 'password' && styles.inputContainerFocused,
                Boolean(errorMessage) && styles.inputContainerError,
              ]}
              testID="auth.login.passwordField"
              collapsable={false}
            >
              <View style={[styles.floatingLabelContainer, reflow && styles.labelReflow]}>
                <Text style={styles.floatingLabelText}>Mật khẩu</Text>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <PasswordIcon size={20} />
                </View>
                <TextInput
                  style={[styles.textInput, reflow && styles.inputReflow]}
                  testID="auth.login.passwordInput"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••••"
                  placeholderTextColor="#8793A3"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Mật khẩu"
                />
                <Pressable
                  style={styles.togglePasswordButton}
                  testID="auth.login.togglePassword"
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  collapsable={false}
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <ShowPasswordIcon size={20} />
                </Pressable>
              </View>
            </View>

            {/* Remember Me and Forgot Password */}
            <View
              style={[styles.checkboxRow, contentWidth, reflow && styles.optionsReflow]}
              testID="auth.login.optionsRow"
              collapsable={false}
            >
              <Pressable
                style={[styles.rememberGroup, reflow && styles.rememberReflow]}
                testID="auth.login.rememberGroup"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Ghi nhớ đăng nhập"
                collapsable={false}
                onPress={() => setRememberMe((prev) => !prev)}
              >
                <View
                  style={[styles.checkboxBox, rememberMe && styles.checkboxChecked]}
                  testID="auth.login.rememberCheckbox"
                  collapsable={false}
                >
                  {rememberMe && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, reflow && styles.wrappingText]}>
                  Ghi nhớ đăng nhập
                </Text>
              </Pressable>

              <Pressable
                style={reflow && styles.forgotReflow}
                testID="auth.login.forgotPassword"
                accessibilityRole="button"
                accessibilityLabel="Quên mật khẩu"
                collapsable={false}
                onPress={handleSimulatedForgot}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </Pressable>
            </View>

            {/* Feedback messages */}
            {errorMessage ? (
              <Text style={styles.errorMessage} testID="auth.login.errorMessage">
                {errorMessage}
              </Text>
            ) : null}

            {noticeMessage ? (
              <Text style={styles.statusNotice} testID="auth.login.notice">
                {noticeMessage}
              </Text>
            ) : null}

            {/* Submit CTA Button */}
            <Pressable
              style={[
                styles.submitButton,
                contentWidth,
                reflow && styles.buttonReflow,
                isLoading && styles.submitButtonDisabled,
              ]}
              testID="auth.login.submit"
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập"
              collapsable={false}
              disabled={isLoading}
              onPress={() => void handleSubmit()}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Text>
            </Pressable>

            {/* Register Link */}
            <Pressable
              style={[styles.registerLinkContainer, contentWidth, reflow && styles.registerReflow]}
              testID="auth.login.registerLink"
              accessibilityRole="button"
              accessibilityLabel="Chưa có tài khoản? Đăng ký"
              collapsable={false}
              onPress={onNavigateToRegister}
            >
              <Text style={styles.registerPrompt}>Chưa có tài khoản?</Text>
              <Text style={styles.registerAction}> Đăng ký</Text>
            </Pressable>

            {/* Continue as Guest Button */}
            <Pressable
              style={[styles.guestButton, contentWidth, reflow && styles.buttonReflow]}
              testID="auth.login.guestButton"
              accessibilityRole="button"
              accessibilityLabel="Tiếp tục với tư cách khách"
              collapsable={false}
              onPress={onNavigateToGuest}
            >
              <Text style={[styles.guestButtonText, reflow && styles.centeredWrappingText]}>
                Tiếp tục với tư cách khách
              </Text>
            </Pressable>

            {/* Terms Footer */}
            <Text
              style={[styles.footerText, contentWidth, reflow && styles.footerReflow]}
              testID="auth.login.termsFooter"
            >
              {`Điều khoản dịch vụ  ·  Chính sách bảo mật`}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;
