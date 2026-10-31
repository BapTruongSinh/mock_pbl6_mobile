/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerBottomNav, type CustomerTab } from '../../shared/components/CustomerBottomNav';
import { AppNotice } from '../../shared/components/AppNotice';
import { accountStyles as s } from './account.styles';
import { AccountProfileForm } from './AccountProfileForm';
import { useAccount } from './useAccount';
const logo = require('../../shared/assets/home/logo.png') as number;
const successIcon =
  require('../../shared/assets/booking/31-183-icon-payment-success.png') as number;
function PasswordField({
  label,
  value,
  onChange,
  testID,
  editable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testID: string;
  editable: boolean;
}): React.ReactElement {
  const [visible, setVisible] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.floatingLabel}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          accessibilityLabel={label}
          testID={testID}
          value={value}
          onChangeText={onChange}
          editable={editable}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          style={s.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#94A4BA"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
          onPress={() => setVisible(!visible)}
          style={s.show}
        >
          <Text style={s.link}>{visible ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
export function AccountScreen({
  onNavigate,
  onLogin,
  onLogout,
  bottomNavigation,
}: {
  onNavigate: (tab: CustomerTab) => void;
  onLogin: () => void;
  onLogout: () => void;
  bottomNavigation?: React.ReactNode;
}): React.ReactElement {
  const account = useAccount();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const profile = account.profile;
  const initials = (profile?.fullName ?? '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <SafeAreaView style={s.root} testID="screen.account">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={s.content}>
            <View style={s.top}>
              <Text accessibilityRole="header" style={s.title}>
                Tài khoản
              </Text>
              <Image source={logo} style={s.logo} resizeMode="contain" accessibilityLabel="BLUE" />
            </View>
            {!account.session ? (
              <View style={s.card}>
                <Text style={s.section}>Chào mừng bạn đến với BLUE</Text>
                <Text style={s.hint}>
                  Đăng nhập để xem thông tin tài khoản và quản lý chuyến đi của bạn.
                </Text>
                <Pressable accessibilityRole="button" onPress={onLogin} style={s.button}>
                  <Text style={s.buttonText}>Đăng nhập</Text>
                </Pressable>
              </View>
            ) : account.loading ? (
              <ActivityIndicator
                size="large"
                color="#246BEE"
                accessibilityLabel="Đang tải tài khoản"
              />
            ) : !profile ? (
              <View style={s.card}>
                <Text style={s.error}>{account.error ?? 'Chưa tải được thông tin tài khoản'}</Text>
                <Pressable onPress={account.retry} accessibilityRole="button">
                  <Text style={s.link}>Thử lại</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={s.hero}>
                  <View style={s.avatar}>
                    {profile.avatarUri ? (
                      <Image
                        source={{ uri: profile.avatarUri }}
                        style={s.avatarImage}
                        accessibilityLabel="Ảnh đại diện của bạn"
                      />
                    ) : (
                      <Text style={s.initials}>{initials}</Text>
                    )}
                  </View>
                  <Text style={s.name}>{profile.fullName}</Text>
                  <Text style={s.hint}>Cùng BLUE trên mọi hành trình</Text>
                  <Pressable
                    accessibilityRole="button"
                    testID="account.avatar"
                    disabled={account.busy}
                    onPress={() => void account.changeAvatar()}
                    style={s.changePhoto}
                  >
                    <Text style={s.link}>{account.busy ? 'Đang xử lý…' : 'Đổi ảnh đại diện'}</Text>
                  </Pressable>
                </View>
                {logoutConfirm ? (
                  <View style={s.card}>
                    <Text style={s.section}>Đăng xuất khỏi tài khoản?</Text>
                    <Text style={s.hint}>Bạn có thể đăng nhập lại bất cứ lúc nào.</Text>
                    <View style={s.logoutActions}>
                      <Pressable
                        accessibilityRole="button"
                        testID="account.logout.cancel"
                        disabled={account.busy}
                        onPress={() => setLogoutConfirm(false)}
                        style={[s.stayButton, account.busy && s.disabled]}
                      >
                        <Text style={s.stayText}>Ở lại</Text>
                      </Pressable>
                      <Pressable
                        disabled={account.busy}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: account.busy }}
                        testID="account.logout.confirm"
                        onPress={() => void account.logout().then(onLogout)}
                        style={[s.confirmLogout, account.busy && s.disabled]}
                      >
                        <Text style={s.confirmLogoutText}>
                          {account.busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={account.busy}
                    testID="account.logout"
                    onPress={() => setLogoutConfirm(true)}
                    style={s.logout}
                  >
                    <Text style={s.logoutText}>Đăng xuất</Text>
                  </Pressable>
                )}
                <AccountProfileForm account={account} />
                <View style={s.card}>
                  <Text style={s.section}>Đổi mật khẩu</Text>
                  <Text style={s.hint}>
                    Sử dụng mật khẩu có ít nhất 8 ký tự để bảo vệ tài khoản của bạn.
                  </Text>
                  <PasswordField
                    label="Mật khẩu hiện tại"
                    testID="account.password.current"
                    value={account.currentPassword}
                    onChange={account.setCurrentPassword}
                    editable={!account.busy}
                  />
                  <PasswordField
                    label="Mật khẩu mới"
                    testID="account.password.new"
                    value={account.newPassword}
                    onChange={account.setNewPassword}
                    editable={!account.busy}
                  />
                  <PasswordField
                    label="Xác nhận mật khẩu mới"
                    testID="account.password.confirm"
                    value={account.confirmPassword}
                    onChange={account.setConfirmPassword}
                    editable={!account.busy}
                  />
                  <Pressable
                    testID="account.password.save"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: account.busy }}
                    disabled={account.busy}
                    onPress={() => void account.changePassword()}
                    style={[s.button, account.busy && s.disabled]}
                  >
                    <Text style={s.buttonText}>
                      {account.busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {bottomNavigation ?? <CustomerBottomNav active="account" onNavigate={onNavigate} />}
      <AppNotice
        notice={account.notice}
        onClose={() => account.setNotice(null)}
        successIcon={successIcon}
      />
    </SafeAreaView>
  );
}
