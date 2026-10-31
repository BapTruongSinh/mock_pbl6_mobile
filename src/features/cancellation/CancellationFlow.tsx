import React, { useReducer, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../auth/useSession';
import { LoginScreen } from '../auth/LoginScreen';
import { bookingTrip, type BookingState } from '../booking/bookingModel';
import { bookingStyles as s } from '../booking/booking.styles';
import { bookingAssets as a } from '../booking/bookingAssets';
import {
  BookingBackground,
  BookingHeader,
  PrimaryButton,
  TripHeading,
} from '../booking/BookingShared';
import { formatFare } from '../search/searchModel';
import {
  cancellationReducer,
  INITIAL_CANCELLATION,
  quoteRefund,
  type CancellationStage,
} from './cancellationModel';
import { cancellationAssets as c } from './cancellationAssets';
export function CancellationFlow({
  booking,
  onClose,
  onUpdate,
  reviewStage,
  reviewSelected,
}: {
  booking: BookingState;
  onClose: () => void;
  onUpdate: (state: BookingState) => void;
  reviewStage?: CancellationStage;
  reviewSelected?: string[];
}): React.ReactElement {
  const { session } = useSession();
  const [geometry, setGeometry] = useState({ width: 334, height: 590 });
  const [loggedIn, setLoggedIn] = useState(false);
  const [state, dispatch] = useReducer(cancellationReducer, {
    ...INITIAL_CANCELLATION,
    stage: reviewStage ?? booking.refundRequest?.stage ?? 'select',
    selected: reviewSelected ?? booking.refundRequest?.seats ?? [],
    cancelled:
      reviewStage === 'refunding' || reviewStage === 'refunded'
        ? (reviewSelected ?? [])
        : booking.refundRequest?.stage === 'refunding' ||
            booking.refundRequest?.stage === 'refunded'
          ? booking.refundRequest.seats
          : [],
  });
  const [sourceBooking] = useState(booking);
  const quote = quoteRefund(
    {
      ...sourceBooking,
      cancelledSeats:
        state.stage === 'refunding' || state.stage === 'refunded'
          ? sourceBooking.cancelledSeats?.filter((id) => !state.selected.includes(id))
          : sourceBooking.cancelledSeats,
    },
    state.selected,
  );
  const trip = bookingTrip(booking);
  const selection = state.stage === 'select' || state.stage === 'preview';
  const preview = state.stage === 'preview';
  function back(): void {
    if (preview) dispatch({ type: 'back' });
    else onClose();
  }
  function backendConfirmed(): void {
    if (state.stage !== 'cancelling') return;
    onUpdate({
      ...booking,
      refundRequest: { seats: [...state.selected], stage: 'refunding' },
      cancelledSeats: [...new Set([...(booking.cancelledSeats ?? []), ...quote.seats])],
    });
    dispatch({ type: 'backend-confirmed' });
  }
  function providerConfirmed(): void {
    if (state.stage !== 'refunding') return;
    onUpdate({
      ...booking,
      refundRequest: { seats: [...state.selected], stage: 'refunded' },
      cancelledSeats: [...new Set([...(booking.cancelledSeats ?? []), ...state.cancelled])],
      refundedSeats: [...new Set([...(booking.refundedSeats ?? []), ...state.cancelled])],
    });
    dispatch({ type: 'provider-confirmed' });
  }
  if (!reviewStage && !loggedIn && session?.role !== 'customer')
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen
          onLoginSuccess={(role) => {
            if (role === 'customer') setLoggedIn(true);
          }}
        />
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={s.link}>Quay lại vé</Text>
        </Pressable>
      </View>
    );
  return (
    <View style={s.root}>
      <BookingBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.content}>
          <BookingHeader
            title={
              selection
                ? preview
                  ? 'Xác nhận hủy vé'
                  : 'Chọn vé cần hủy'
                : state.stage === 'cancelling'
                  ? 'Hủy vé'
                  : 'Hoàn tiền'
            }
            blue
            onBack={back}
            status={selection ? undefined : a.shield}
          />
          <ScrollView
            testID={`screen.cancellation.${state.stage}`}
            contentContainerStyle={[
              s.scroll,
              { paddingTop: 0, paddingHorizontal: selection ? 28 : 20 },
            ]}
          >
            <View
              onLayout={(event) =>
                setGeometry({
                  width: event.nativeEvent.layout.width,
                  height: event.nativeEvent.layout.height,
                })
              }
              style={selection ? [s.ticket, { backgroundColor: 'transparent' }] : s.paymentCard}
            >
              {selection && (
                <Image
                  source={a.passengerBackground}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: geometry.width,
                    height: geometry.height,
                  }}
                  resizeMode="stretch"
                />
              )}
              {selection ? (
                <>
                  <TripHeading trip={trip} showDetails={false} />
                  <View style={s.detailGrid}>
                    {[
                      [
                        'Trạng thái vé',
                        preview
                          ? `Sẽ hủy vé ${state.selected.join(', ')}`
                          : `Đã chọn ${state.selected.length} / ${booking.seats.length} vé`,
                      ],
                      ['Khởi hành', `28/08 lúc ${trip.departure}`],
                      [
                        'Hành khách',
                        `${preview ? state.selected.length : booking.seats.length} người`,
                      ],
                      [
                        preview ? 'Sau khi xác nhận' : 'Chọn một hoặc nhiều',
                        preview ? 'QR ghế đã hủy hết hiệu lực' : 'Chạm để chọn vé',
                      ],
                    ].map(([label, value]) => (
                      <View key={label} style={s.detail}>
                        <Text style={s.small}>{label}</Text>
                        <Text style={s.body}>{value}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.divider} />
                  {booking.seats.map((id) => {
                    const checked = state.selected.includes(id);
                    const cancelled = booking.cancelledSeats?.includes(id);
                    const dim = cancelled || (preview && !checked);
                    return (
                      <Pressable
                        key={id}
                        testID={`cancel.seat.${id}`}
                        accessibilityRole={preview ? 'text' : 'checkbox'}
                        accessibilityState={{ checked, disabled: preview || !!cancelled }}
                        disabled={preview || !!cancelled}
                        style={[s.passenger, dim && { backgroundColor: '#F1F4F9', opacity: 0.5 }]}
                        onPress={() => dispatch({ type: 'toggle', seat: id })}
                      >
                        {preview && (
                          <View style={s.avatar}>
                            <Image source={a.person} style={{ width: 18, height: 18 }} />
                          </View>
                        )}
                        <View style={s.flex}>
                          <Text style={s.body}>
                            {booking.passengers[id]?.fullName ?? 'Hành khách'}
                          </Text>
                          <Text style={s.small}>
                            {cancelled
                              ? 'Đã hủy'
                              : preview && !checked
                                ? 'Không hủy — Giữ nguyên vé'
                                : booking.passengers[id]?.phone}
                          </Text>
                        </View>
                        <View>
                          <Text style={[s.small, s.right]}>Ghế</Text>
                          <Text style={s.body}>{id}</Text>
                        </View>
                        {!preview && (
                          <Image
                            source={checked ? c.checked : c.unchecked}
                            style={{ width: 22, height: 22 }}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                  <View style={s.divider} />
                  <View style={s.field}>
                    <Image source={a.pickup} style={{ width: 20, height: 20 }} />
                    <View style={s.flex}>
                      <Text style={s.small}>Điểm đón</Text>
                      <Text style={s.body}>{booking.pickup}</Text>
                    </View>
                  </View>
                  <View style={s.field}>
                    <Image source={c.policy} style={{ width: 20, height: 20 }} />
                    <View style={s.flex}>
                      <Text style={s.small}>Chính sách hủy · MÔ PHỎNG</Text>
                      <Text style={s.body}>Mức 1 — Từ 24 giờ trở lên</Text>
                    </View>
                  </View>
                  <View style={s.field}>
                    <Image source={a.receipt} style={{ width: 20, height: 20 }} />
                    <View style={s.flex}>
                      <Text style={s.small}>Chi phí</Text>
                      <Text style={s.body}>
                        {quote.seats.length
                          ? `Giá ${quote.seats.length} vé: ${formatFare(quote.gross)}`
                          : 'Chưa chọn vé'}
                      </Text>
                      <Text style={s.small}>Phí hủy 10%: {formatFare(quote.fee)}</Text>
                    </View>
                    <Text style={[s.body, s.bold]}>{formatFare(quote.refund)}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Image
                    source={state.stage === 'refunded' ? a.paymentSuccess : c.processing}
                    style={{ width: 88, height: 88, marginTop: 6 }}
                  />
                  <View style={state.stage === 'refunded' ? s.issued : s.pill}>
                    <Text style={state.stage === 'refunded' ? s.issuedText : s.pillText}>
                      {state.stage === 'cancelling'
                        ? 'Đang gửi yêu cầu'
                        : state.stage === 'refunding'
                          ? 'Đang hoàn tiền'
                          : 'Đã hoàn tiền'}
                    </Text>
                  </View>
                  <Text style={s.paymentTitle}>
                    {state.stage === 'cancelling'
                      ? 'VNPay đang xử lý'
                      : state.stage === 'refunding'
                        ? 'VNPay đang xử lý'
                        : 'Hoàn tiền thành công'}
                  </Text>
                  <Text style={[s.small, { textAlign: 'center' }]}>
                    {state.stage === 'cancelling'
                      ? 'Yêu cầu của bạn đang được xử lý. Vui lòng chờ trong giây lát.'
                      : state.stage === 'refunding'
                        ? 'Dự kiến hoàn tất trong 3–7 ngày làm việc'
                        : 'Hệ thống đã xác nhận hoàn tiền về phương thức thanh toán ban đầu.'}
                  </Text>
                  <View style={s.progress}>
                    <View style={s.progressTrack} />
                    <View style={s.progressLabels}>
                      {(state.stage === 'cancelling'
                        ? ['Yêu cầu hủy', 'VNPay xử lý', 'Hoàn tất']
                        : ['Vé đã hủy', 'VNPay xử lý', 'Thông báo']
                      ).map((label, index) => (
                        <View key={label} style={s.progressStep}>
                          <Image
                            source={
                              state.stage === 'refunded' || index === 0
                                ? c.received
                                : index === 1
                                  ? c.verifying
                                  : c.complete
                            }
                            style={{ width: 20, height: 20 }}
                          />
                          <Text style={s.small}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={s.paymentSummary}>
                    <View style={s.spread}>
                      <View style={s.flex}>
                        <Text style={s.body}>TP.HCM → Đà Lạt</Text>
                        <Text style={s.small}>
                          {trip.operator} · 28/08 · {trip.departure}
                        </Text>
                      </View>
                      <Text style={[s.body, s.bold]}>{formatFare(quote.refund)}</Text>
                    </View>
                    <Text style={s.small}>Ghế {state.selected.join(', ')}</Text>
                  </View>
                  <View style={s.paymentSummary}>
                    <Text style={s.small}>Mã hoàn tiền</Text>
                    <Text style={s.body}>
                      RF-MOCK-{trip.id}-{state.selected.join('-')}
                    </Text>
                  </View>
                  <View style={s.success}>
                    <Image source={a.confirmed} style={{ width: 18, height: 18 }} />
                    <Text style={s.successText}>
                      {state.stage === 'refunded'
                        ? 'Đã hoàn tất hủy và hoàn tiền'
                        : 'Không gửi lại yêu cầu hủy'}
                    </Text>
                  </View>
                </>
              )}
            </View>
            {selection ? (
              <>
                <PrimaryButton
                  testID={preview ? 'cancel.confirm' : 'cancel.preview'}
                  disabled={!quote.seats.length}
                  label={preview ? `XÁC NHẬN HỦY ${quote.seats.length} VÉ` : 'XEM PHÍ VÀ TIỀN HOÀN'}
                  onPress={() => {
                    if (preview)
                      onUpdate({
                        ...booking,
                        refundRequest: { seats: [...quote.seats], stage: 'cancelling' },
                      });
                    dispatch({ type: preview ? 'request' : 'preview' });
                  }}
                />
                <View style={s.spread}>
                  <Text style={s.small}>
                    Được hoàn <Text style={s.body}>{formatFare(quote.refund)}</Text>
                  </Text>
                  <Text style={s.small}>Chính sách mock</Text>
                </View>
                <View style={s.spread}>
                  <Text style={s.small}>Mã booking</Text>
                  <Text style={s.small}>{trip.id}-DEMO</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.row}>
                  <Image source={a.ticket} style={{ width: 20, height: 20 }} />
                  <View style={s.flex}>
                    <Text style={s.body}>
                      {state.stage === 'cancelling'
                        ? 'Vé chưa đổi trạng thái'
                        : state.stage === 'refunded'
                          ? 'Vé đã hủy · Đã hoàn tiền'
                          : 'Vé đã ở trạng thái Đã hủy'}
                    </Text>
                    <Text style={s.small}>BLUE sẽ thông báo khi hoàn tất</Text>
                  </View>
                </View>
                {state.stage !== 'refunded' && (
                  <View style={s.mockPanel}>
                    <Text style={s.body}>Điều khiển mock để kiểm thử</Text>
                    <Text style={s.note}>
                      Bản mô phỏng: dùng nút bên dưới để kiểm tra bước tiếp theo.
                    </Text>
                    <PrimaryButton
                      testID={
                        state.stage === 'cancelling'
                          ? 'cancel.backendConfirmed'
                          : 'cancel.providerConfirmed'
                      }
                      label={
                        state.stage === 'cancelling'
                          ? 'Giả lập xác nhận hủy vé'
                          : 'Giả lập VNPay xác nhận đã hoàn tiền'
                      }
                      onPress={state.stage === 'cancelling' ? backendConfirmed : providerConfirmed}
                    />
                  </View>
                )}
                <PrimaryButton testID="cancel.done" label="Về vé của tôi" onPress={onClose} />
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
