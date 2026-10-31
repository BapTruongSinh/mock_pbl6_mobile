import React from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { GuestScreenLayout } from './GuestScreenLayout';
import { guestStyles as styles } from './guest.styles';
export function GuestMenuScreen({
  onLookup,
  onViewTrips,
  onBack,
}: {
  onLookup?: () => void;
  onViewTrips?: () => void;
  onBack?: () => void;
}): React.ReactElement {
  return (
    <GuestScreenLayout
      title="Chào mừng bạn đến BLUE."
      subtitle="Tiếp tục với tư cách khách. Bạn muốn làm gì hôm nay?"
      testID="screen.NEW-GUEST-MENU"
      onBack={onBack}
    >
      <Pressable
        style={[styles.choice, styles.primary]}
        accessibilityRole="button"
        testID="guest.menu.lookup"
        onPress={onLookup}
      >
        <Text style={styles.primaryText}>Tra cứu vé</Text>
      </Pressable>
      <Pressable
        style={[styles.choice, styles.secondary]}
        accessibilityRole="button"
        testID="guest.menu.trips"
        onPress={
          onViewTrips ?? (() => Alert.alert('Xem chuyến', 'Chức năng này sẽ sớm được cập nhật.'))
        }
      >
        <Text style={styles.secondaryText}>Xem chuyến</Text>
      </Pressable>
      <Text style={styles.hint}>
        Tra cứu vé đã mua hoặc tìm chuyến đi phù hợp.{'\n'}Bạn chưa cần đăng nhập ở bước này.
      </Text>
    </GuestScreenLayout>
  );
}
