import { bookingTrip } from './bookingModel';
import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { bookingStyles as s } from './booking.styles';
import { bookingAssets as a } from './bookingAssets';
import { remainingHold, type BookingState } from './bookingModel';
import { formatFare } from '../search/searchModel';
import { PrimaryButton } from './BookingShared';
import { LocalQr } from './LocalQr';
export function PaymentScreen({
  state,
  now,
  onReported,
  onConfirmed,
  onBackToQr,
}: {
  state: BookingState;
  now: number;
  onReported: () => void;
  onConfirmed: () => void;
  onBackToQr: () => void;
}): React.ReactElement {
  const processing = state.stage === 'processing';
  const expired = !!state.expiresAt && now >= state.expiresAt;
  const reference = `${bookingTrip(state).id}-DEMO-${state.seats.join('-')}`;
  const total = state.seats.length * bookingTrip(state).fare;
  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: 10 }]}
      testID={processing ? 'screen.FIGMA-31-172' : 'screen.NEW-VNPAY-QR'}
    >
      <View style={s.paymentCard}>
        {processing ? (
          <>
            <Image source={a.processing} style={{ width: 88, height: 88, marginTop: 6 }} />
            <View style={s.pill}>
              <Text style={s.pillText}>Đang xử lý</Text>
            </View>
            <Text style={s.paymentTitle}>Đang kiểm tra thanh toán</Text>
            <Text style={[s.small, { textAlign: 'center' }]}>
              Thường hoàn tất trong dưới 1 phút
            </Text>
            <View style={s.progress}>
              <View style={s.progressTrack} />
              <View style={s.progressLabels}>
                {[
                  [a.received, 'Đã nhận'],
                  [a.verifying, 'Đối soát'],
                  [a.complete, 'Hoàn tất'],
                ].map(([asset, label]) => (
                  <View key={label} style={s.progressStep}>
                    <Image source={Number(asset)} style={{ width: 20, height: 20 }} />
                    <Text style={s.small}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={s.paymentTitle}>Thanh toán qua VNPay</Text>
            <Text style={s.note}>Quét mã để thanh toán đơn đặt vé</Text>
            <View style={s.qr}>
              <LocalQr
                payload={JSON.stringify({
                  type: 'VNPAY_DEMO_NOT_PAYABLE',
                  reference,
                  amount: total,
                })}
                size={210}
              />
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>MÃ MÔ PHỎNG · KHÔNG CHUYỂN TIỀN THẬT</Text>
            </View>
            <Text style={s.timer}>{remainingHold(state.expiresAt, now)}</Text>
          </>
        )}
        <View style={s.paymentSummary}>
          <View style={s.row}>
            <Image source={a.bus} style={{ width: 34, height: 34 }} />
            <View style={s.flex}>
              <Text style={s.body}>TP.HCM → Lâm Đồng</Text>
              <Text style={s.small}>
                {bookingTrip(state).operator} · 28/08 · {bookingTrip(state).departure}
              </Text>
            </View>
            <Text style={[s.body, s.bold]}>{formatFare(total)}</Text>
          </View>
          <Text style={s.small}>Ghế: {state.seats.join(', ')}</Text>
        </View>
        <View style={s.paymentSummary}>
          <View style={s.row}>
            <Image source={a.receipt} style={{ width: 20, height: 20 }} />
            <View style={s.flex}>
              <Text style={s.small}>Mã đặt chỗ</Text>
              <Text style={s.body}>{reference}</Text>
            </View>
          </View>
        </View>
        {processing ? (
          <View style={s.success}>
            <Image source={a.confirmed} style={{ width: 18, height: 18 }} />
            <Text style={s.successText}>Không cần thanh toán lại</Text>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <PrimaryButton
              testID="booking.payment.reported"
              label="Tôi đã chuyển tiền"
              onPress={onReported}
              disabled={expired}
            />
          </View>
        )}
        {state.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {state.error}
          </Text>
        )}
        {expired && (
          <Text accessibilityRole="alert" style={s.error}>
            Phiên giữ ghế đã hết hạn. Chưa phát hành vé.
          </Text>
        )}
      </View>
      <View style={s.mockPanel}>
        <Text style={s.body}>Mô phỏng hệ thống xác nhận</Text>
        <Text style={s.note}>
          Chỉ dành cho bản mock. Nút này giả lập kết quả đối soát từ hệ thống; nút “Tôi đã chuyển
          tiền” không xác nhận thành công.
        </Text>
        <PrimaryButton
          testID="booking.payment.confirmed"
          label="Giả lập hệ thống xác nhận thành công"
          onPress={onConfirmed}
          disabled={expired}
        />
      </View>
      {processing && (
        <Pressable accessibilityRole="button" onPress={onBackToQr}>
          <Text style={s.link}>Xem lại mã QR</Text>
        </Pressable>
      )}
      <View style={s.row}>
        <Image source={a.ticket} style={{ width: 20, height: 20 }} />
        <View style={s.flex}>
          <Text style={s.body}>Kết quả sẽ lưu trong Vé</Text>
          <Text style={s.small}>Tự động cập nhật khi hoàn tất</Text>
        </View>
      </View>
    </ScrollView>
  );
}
