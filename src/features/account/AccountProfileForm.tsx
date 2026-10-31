import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import type { AccountController } from './useAccount';
import { accountStyles as s } from './account.styles';
export function AccountProfileForm({
  account,
}: {
  account: AccountController;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState('');
  const driver = account.session?.role === 'driver';
  useEffect(() => {
    setEmail(account.profile?.email ?? '');
    setPhone(account.profile?.phone ?? '');
    setBirth(account.profile?.dateOfBirth ?? '');
  }, [account.profile]);
  const d = birth ? new Date(birth + 'T00:00:00Z') : null;
  const today = new Date();
  let age = d && Number.isFinite(d.getTime()) ? today.getFullYear() - d.getUTCFullYear() : null;
  if (
    age !== null &&
    d &&
    (today.getMonth() < d.getUTCMonth() ||
      (today.getMonth() === d.getUTCMonth() && today.getDate() < d.getUTCDate()))
  )
    age--;
  return (
    <View style={s.card}>
      <Text style={s.section}>Thông tin cá nhân</Text>
      <View style={s.info}>
        <Text style={s.label}>Họ và tên</Text>
        <Text style={s.value}>{account.profile?.fullName}</Text>
      </View>
      {(
        [
          { key: 'email', label: 'Email', value: email, set: setEmail, editable: true },
          { key: 'phone', label: 'Số điện thoại', value: phone, set: setPhone, editable: !driver },
          {
            key: 'birth',
            label: 'Ngày sinh (YYYY-MM-DD)',
            value: birth,
            set: setBirth,
            editable: !driver,
          },
        ] as const
      ).map((field) => (
        <View key={field.key} style={s.field}>
          <Text style={s.floatingLabel}>{field.label}</Text>
          <TextInput
            testID={'account.profile.' + field.key}
            accessibilityLabel={field.label}
            value={field.value}
            onChangeText={field.set}
            editable={field.editable && !account.busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={
              field.key === 'email'
                ? 'email-address'
                : field.key === 'phone'
                  ? 'phone-pad'
                  : 'default'
            }
            placeholder={field.editable ? 'Chưa cung cấp' : 'Chưa cung cấp · chỉ xem'}
            style={[s.input, !field.editable && { color: '#7487A3' }]}
          />
        </View>
      ))}
      <View style={s.info}>
        <Text style={s.label}>Tuổi</Text>
        <Text testID="account.profile.age" style={s.value}>
          {age !== null && age >= 0 ? age + ' tuổi' : 'Chưa cung cấp'}
        </Text>
      </View>
      <Text style={s.hint}>
        {driver
          ? 'Số điện thoại và ngày sinh do nhà xe quản lý. Tuổi tự tính từ ngày sinh.'
          : 'Tuổi tự cập nhật theo ngày sinh của bạn.'}
      </Text>
      <Pressable
        testID="account.profile.save"
        accessibilityRole="button"
        disabled={account.busy}
        style={[s.button, account.busy && s.disabled]}
        onPress={() =>
          void account.updateProfile(driver ? { email } : { email, phone, dateOfBirth: birth })
        }
      >
        <Text style={s.buttonText}>Lưu thông tin</Text>
      </Pressable>
    </View>
  );
}
