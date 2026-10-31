import React from 'react';
import { Alert, Pressable, Text, View, TextInput } from 'react-native';
import { GuestScreenLayout } from './GuestScreenLayout';
import { guestStyles as styles } from './guest.styles';
import { useGuestLookupForm } from './useGuestLookupForm';
import { colors } from '../../shared/theme/tokens';
export function GuestTicketLookupScreen({
  onScanQr,
  onBack,
}: {
  onScanQr?: () => void;
  onBack?: () => void;
}): React.ReactElement {
  const form = useGuestLookupForm();
  return (
    <GuestScreenLayout
      title="Tra cứu vé của bạn."
      subtitle="Nhập mã vé và số điện thoại đã dùng khi đặt vé để tra cứu."
      testID="screen.NEW-GUEST-LOOKUP"
      onBack={onBack}
    >
      <View style={styles.field}>
        <Text style={styles.label}>Mã vé</Text>
        <TextInput
          style={styles.input}
          testID="guest.lookup.ticketCode"
          accessibilityLabel="Mã vé"
          placeholder="Nhập mã vé"
          placeholderTextColor={colors.textSecondary}
          value={form.ticketCode}
          onChangeText={form.setTicketCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Số điện thoại đặt vé</Text>
        <TextInput
          style={styles.input}
          testID="guest.lookup.bookingPhone"
          accessibilityLabel="Số điện thoại đặt vé"
          placeholder="Nhập số điện thoại"
          placeholderTextColor={colors.textSecondary}
          value={form.bookingPhone}
          onChangeText={form.setBookingPhone}
          keyboardType="phone-pad"
          autoCorrect={false}
        />
      </View>
      {form.message && (
        <Text
          style={[styles.message, form.hasError && styles.error]}
          accessibilityRole={form.hasError ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          testID="guest.lookup.message"
        >
          {form.message}
        </Text>
      )}
      <Pressable
        style={[styles.choice, styles.primary, styles.lookupButton]}
        testID="guest.lookup.submit"
        accessibilityRole="button"
        onPress={form.submit}
      >
        <Text style={styles.primaryText}>Tra cứu vé</Text>
      </Pressable>
      <Pressable
        style={[styles.choice, styles.secondary, styles.qrButton]}
        testID="guest.lookup.qr"
        accessibilityRole="button"
        onPress={
          onScanQr ?? (() => Alert.alert('Quét QR', 'Chức năng quét QR sẽ sớm được cập nhật.'))
        }
      >
        <Text style={styles.secondaryText}>Hoặc quét QR</Text>
      </Pressable>
      <Text style={styles.hint}>Bạn có thể tìm mã vé trong vé điện tử đã nhận.</Text>
    </GuestScreenLayout>
  );
}
