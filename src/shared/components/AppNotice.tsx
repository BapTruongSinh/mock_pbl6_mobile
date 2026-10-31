import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { typography } from '../theme/tokens';
export interface AppNoticeValue {
  title: string;
  message: string;
  variant: 'success' | 'error';
}
export function AppNotice({
  notice,
  onClose,
  successIcon,
}: {
  notice: AppNoticeValue | null;
  onClose: () => void;
  successIcon: number;
}): React.ReactElement {
  const success = notice?.variant === 'success';
  return (
    <Modal
      visible={notice !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.scrim}>
        <View style={s.card} accessibilityViewIsModal>
          <View style={[s.icon, { backgroundColor: success ? '#E8FAF0' : '#FFF0EE' }]}>
            {success ? (
              <Image source={successIcon} style={{ width: 32, height: 32 }} />
            ) : (
              <Text style={s.errorIcon}>!</Text>
            )}
          </View>
          <Text accessibilityRole="header" style={s.title}>
            {notice?.title}
          </Text>
          <Text accessibilityRole="alert" style={s.message}>
            {notice?.message}
          </Text>
          <Pressable
            testID="notice.close"
            accessibilityRole="button"
            onPress={onClose}
            style={s.button}
          >
            <Text style={s.buttonText}>{success ? 'Tuyệt, đã hiểu' : 'Đã hiểu'}</Text>
          </Pressable>
          <Text style={s.caption}>BLUE · Đồng hành cùng chuyến đi</Text>
        </View>
      </View>
    </Modal>
  );
}
const f = typography.fontFamily;
const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(7,23,49,0.42)', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    gap: 14,
    boxShadow: '0px 16px 40px rgba(10,31,71,0.18)',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorIcon: { fontFamily: f.bold, fontSize: 30, color: '#C44739' },
  title: { fontFamily: f.bold, fontSize: 21, color: '#10243E', textAlign: 'center' },
  message: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 21,
    color: '#637894',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    minHeight: 50,
    backgroundColor: '#246BEB',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
  },
  buttonText: { fontFamily: f.semiBold, fontSize: 13, color: 'white' },
  caption: { fontFamily: f.regular, fontSize: 9, color: '#8B9AB0', textAlign: 'center' },
});
