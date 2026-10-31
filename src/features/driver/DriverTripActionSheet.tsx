import React from 'react';
import { Modal, View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../../shared/theme/tokens';
import { driverActionAssets } from './driverActionAssets';
export type ActionSheetMode =
  | 'confirm'
  | 'pending'
  | 'invalid'
  | 'conflict'
  | 'uncertain'
  | 'expired'
  | 'offline'
  | 'forbidden';
export const ACTION_NODE = {
  scheduled: '1140:18',
  boarding: '1140:92',
  travelling: '1140:240',
  arrived: '1140:314',
  completed: '1140:314',
};
export const PENDING_NODE = {
  scheduled: '1140:1041',
  boarding: '1140:1113',
  travelling: '1140:1257',
  arrived: '1140:1257',
  completed: '1140:1257',
};
const titles = {
  scheduled: 'Bắt đầu đón khách?',
  boarding: 'Xác nhận xuất bến?',
  travelling: 'Xác nhận đã đến nơi?',
  arrived: 'Hoàn tất chuyến?',
  completed: 'Hoàn tất chuyến?',
};
const descriptions = {
  scheduled: 'Chuyển chuyến từ Đã lên lịch sang Đang đón khách. Bạn có thể bắt đầu soát vé.',
  boarding: 'Chuyến sẽ chuyển sang Đã xuất bến. Kiểm tra danh sách khách trước khi tiếp tục.',
  travelling: 'Chuyển chuyến sang Đã đến nơi sau khi xe tới điểm kết thúc hành trình.',
  arrived:
    'Chuyến sẽ được ghi nhận Đã hoàn thành. Kiểm tra công việc đón trả khách trước khi xác nhận.',
  completed: 'Chuyến đã hoàn thành.',
};
export function DriverTripActionSheet({
  mode,
  stage,
  node,
  driverName,
  onConfirm,
  onReload,
  onClose,
  onHome,
  onLogin,
  enabled = true,
}: {
  mode: ActionSheetMode | null;
  stage: keyof typeof ACTION_NODE;
  node?: string;
  driverName: string;
  onConfirm: () => void;
  onReload: () => void;
  onClose: () => void;
  onHome: () => void;
  onLogin: () => void;
  enabled?: boolean;
}): React.ReactElement {
  const insets = useSafeAreaInsets();
  const pending = mode === 'pending';
  const confirm = mode === 'confirm';
  const id =
    node ??
    (confirm
      ? ACTION_NODE[stage]
      : pending
        ? PENDING_NODE[stage]
        : mode === 'invalid'
          ? '1140:1401'
          : mode === 'conflict'
            ? '1140:1474'
            : '1140:1547');
  const a = driverActionAssets[id] ?? driverActionAssets['1140:1547'] ?? {};
  const title = confirm
    ? titles[stage]
    : pending
      ? 'Đang gửi xác nhận'
      : mode === 'invalid'
        ? 'Không thể chuyển trạng thái'
        : mode === 'conflict'
          ? 'Chuyến vừa được cập nhật'
          : mode === 'expired'
            ? 'Phiên đăng nhập đã hết hạn'
            : mode === 'offline'
              ? 'Mất kết nối'
              : mode === 'forbidden'
                ? 'Chuyến không còn khả dụng'
                : 'Chưa xác nhận cập nhật';
  const copy = confirm
    ? descriptions[stage]
    : pending
      ? 'Hệ thống đang kiểm tra phân công và trạng thái mới nhất của chuyến.'
      : mode === 'invalid'
        ? 'Thao tác không phù hợp với trạng thái hiện tại của chuyến. Tải lại để xem hành động được phép.'
        : mode === 'conflict'
          ? 'Điều hành hoặc thiết bị khác đã thay đổi chuyến. Tải lại thông tin trước khi tiếp tục.'
          : mode === 'expired'
            ? 'Vui lòng đăng nhập lại để tiếp tục công việc.'
            : mode === 'offline'
              ? 'Kiểm tra kết nối rồi tải lại trạng thái chuyến trước khi tiếp tục.'
              : mode === 'forbidden'
                ? 'Phân công hoặc quyền tài xế không còn hiệu lực.'
                : 'Kết nối bị gián đoạn. Kiểm tra trạng thái trên hệ thống trước khi gửi lại.';
  const action = confirm
    ? 'Xác nhận'
    : pending
      ? 'Đang cập nhật'
      : mode === 'expired'
        ? 'Đăng nhập lại'
        : mode === 'forbidden'
          ? 'Về chuyến của tôi'
          : 'Tải lại trạng thái chuyến';
  return (
    <Modal
      visible={mode !== null}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!pending) onClose();
      }}
    >
      <View style={s.scrim}>
        <View
          style={[s.sheet, { paddingBottom: 24 + insets.bottom }]}
          accessibilityViewIsModal
          testID={'driver.action.sheet.' + mode}
        >
          <ScrollView contentContainerStyle={s.content} bounces={false}>
            <View style={s.handle} />
            <View style={s.row}>
              <Image
                source={
                  a[confirm ? 'imgIconBus1' : pending ? 'imgIconRefresh' : 'imgIconAlert'] ??
                  a.imgIconShield
                }
                style={s.icon}
                resizeMode="contain"
              />
              <Text accessibilityRole="header" style={s.title}>
                {title}
              </Text>
            </View>
            <Text style={s.copy}>{copy}</Text>
            <Text style={s.note}>
              {confirm
                ? 'Thao tác được ghi nhận theo tài khoản ' + driverName + '.'
                : pending
                  ? 'Đang xử lý…'
                  : mode === 'expired'
                    ? 'Thông tin chuyến cần được xác thực lại.'
                    : 'Tải lại trạng thái chuyến'}
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="driver.action.confirm"
              disabled={pending || (confirm && !enabled)}
              accessibilityState={{ disabled: pending || (confirm && !enabled) }}
              style={[s.button, s.primary, (pending || (confirm && !enabled)) && s.disabled]}
              onPress={
                confirm
                  ? onConfirm
                  : mode === 'expired'
                    ? onLogin
                    : mode === 'forbidden'
                      ? onHome
                      : onReload
              }
            >
              <Text style={s.white}>{action}</Text>
            </Pressable>
            {!pending && (
              <Pressable
                accessibilityRole="button"
                testID="driver.action.cancel"
                style={s.button}
                onPress={confirm ? onClose : onHome}
              >
                <Text style={s.blue}>{confirm ? 'Quay lại' : 'Về chuyến của tôi'}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(16,35,63,.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  content: { gap: 14 },
  handle: { height: 4, width: 36, borderRadius: 2, backgroundColor: '#DFE7F3' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 20, height: 20 },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: '#122640',
    flex: 1,
  },
  copy: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#7487A3',
  },
  note: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    color: '#7487A3',
  },
  button: {
    minHeight: 46,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F1F6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#2166F3' },
  disabled: { opacity: 0.5 },
  white: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  blue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: '#2166F3',
    textAlign: 'center',
  },
});
