import { CancellationFlow } from '../cancellation/CancellationFlow';
import { useSession } from '../auth/useSession';
import { updateDemoBooking } from './demoTicketRepository';
import { bookingTrip } from './bookingModel';
import { AppNotice, type AppNoticeValue } from '../../shared/components/AppNotice';
import React, { useRef, useState } from 'react';
import { DownloadableTicket } from './DownloadableTicket';
import { saveTicketImage } from './ticketExport';
import { PrimaryButton } from './BookingShared';
import { Image, Modal, ScrollView, Text, View } from 'react-native';
import { bookingStyles as s } from './booking.styles';
import { bookingAssets as a } from './bookingAssets';
import { type BookingState } from './bookingModel';
import { TripHeading } from './BookingShared';
import { LocalQr } from './LocalQr';
export function TicketScreen({
  state: incomingState,
  onReturnToList,
  cancellationEligible = true,
}: {
  state: BookingState;
  onReturnToList?: () => void;
  cancellationEligible?: boolean;
}): React.ReactElement {
  const { session } = useSession();
  const [state, setState] = useState(incomingState);
  const [cancelling, setCancelling] = useState(false);
  const activeSeats = state.seats.filter((id) => !state.cancelledSeats?.includes(id));
  const activeState = { ...state, seats: activeSeats };
  const [notice, setNotice] = useState<AppNoticeValue | null>(null);
  const ticketRef = useRef<View>(null);
  const qrRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);
  async function download(kind: 'ticket' | 'qr'): Promise<void> {
    if (saving) return;
    setSaving(true);
    try {
      await saveTicketImage(kind === 'ticket' ? ticketRef : qrRef);
      setNotice({
        variant: 'success',
        title: kind === 'ticket' ? 'Vé đã sẵn sàng!' : 'Đã lưu mã QR!',
        message:
          kind === 'ticket'
            ? 'Ảnh vé và mã QR đã được lưu vào thư viện điện thoại. Bạn có thể mở lại bất cứ lúc nào.'
            : 'Mã QR đã được lưu vào thư viện. Hãy chuẩn bị mã khi lên xe nhé.',
      });
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Chưa thể lưu ảnh',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      });
    } finally {
      setSaving(false);
    }
  }
  const code = `${bookingTrip(state).id}-DEMO-${activeSeats.join('-')}`;
  return (
    <>
      <AppNotice notice={notice} onClose={() => setNotice(null)} successIcon={a.paymentSuccess} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: 0 }]}
        testID="screen.FIGMA-31-183"
      >
        <View style={s.ticket}>
          <TripHeading trip={bookingTrip(state)} showDetails={false} />
          <View style={s.issued}>
            <Text style={s.issuedText}>
              {!activeSeats.length
                ? 'Đã hủy'
                : state.cancelledSeats?.length
                  ? 'Đã hủy một phần'
                  : '● Đã phát hành'}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.detailGrid}>
            <View style={s.detail}>
              <Text style={s.small}>Loại xe</Text>
              <Text style={s.body}>{bookingTrip(state).vehicle}</Text>
            </View>
            <View style={s.detail}>
              <Text style={s.small}>Khởi hành</Text>
              <Text style={s.body}>28/08 · {bookingTrip(state).departure}</Text>
            </View>
            <View style={s.detail}>
              <Text style={s.small}>Hành khách</Text>
              <Text style={s.body}>{state.seats.length} người</Text>
            </View>
            <View style={s.detail}>
              <Text style={s.small}>Ghế</Text>
              <Text style={s.body}>{state.seats.join(' · ')}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <Text style={s.small}>HÀNH KHÁCH</Text>
          {state.seats.map((id) => (
            <View key={id} style={[s.passenger, { backgroundColor: '#F7F9FC', borderWidth: 0 }]}>
              <Image source={a.person} style={{ width: 22, height: 22 }} />
              <View style={s.flex}>
                <Text style={s.body}>{state.passengers[id]?.fullName}</Text>
                <Text style={s.small}>
                  {state.cancelledSeats?.includes(id)
                    ? state.refundedSeats?.includes(id)
                      ? 'Đã hủy · Đã hoàn tiền'
                      : 'Đã hủy · Chờ hoàn tiền'
                    : state.passengers[id]?.phone}
                </Text>
              </View>
              <View style={s.chip}>
                <Text style={s.chipText}>{id}</Text>
              </View>
            </View>
          ))}
          <View style={s.divider} />
          <View style={s.boarding}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.small, { fontSize: 8 }]}>QUÉT KHI LÊN XE · VÉ MOCK</Text>
              {activeSeats.length > 0 ? (
                <LocalQr
                  payload={JSON.stringify({
                    version: 1,
                    ticketCode: code,
                    signature: `mock:${code}`,
                  })}
                  size={121}
                />
              ) : (
                <Text style={s.error}>QR vé đã hủy hết hiệu lực</Text>
              )}
              <Text style={[s.small, { fontSize: 8 }]}>{code}</Text>
            </View>
            <View style={s.locations}>
              <View style={s.row}>
                <Image source={a.pickup} style={{ width: 20, height: 20 }} />
                <View style={s.flex}>
                  <Text style={s.small}>Điểm đón</Text>
                  <Text style={s.body}>{state.pickup}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.row}>
                <Image source={a.dropoff} style={{ width: 20, height: 20 }} />
                <View style={s.flex}>
                  <Text style={s.small}>Điểm trả</Text>
                  <Text style={s.body}>{state.dropoff}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={s.success}>
            <Image source={a.paymentIcon} style={{ width: 18, height: 18 }} />
            <Text style={[s.successText, s.flex]}>Thanh toán · VNPay</Text>
            <Text style={s.successText}>Thành công</Text>
            <Image source={a.paymentSuccess} style={{ width: 22, height: 22 }} />
          </View>
        </View>
        <PrimaryButton
          testID="ticket.download"
          label={saving ? 'Đang lưu…' : 'Tải ảnh vé kèm QR'}
          disabled={saving || !activeSeats.length}
          onPress={() => {
            void download('ticket');
          }}
        />
        <PrimaryButton
          testID="ticket.cancel"
          label="Hủy vé"
          disabled={!activeSeats.length || !cancellationEligible}
          onPress={() => {
            if (state.refundRequest?.stage === 'refunded')
              setState({ ...state, refundRequest: undefined });
            setCancelling(true);
          }}
        />
        <Modal
          visible={cancelling}
          animationType="slide"
          onRequestClose={() => setCancelling(false)}
        >
          <CancellationFlow
            booking={state}
            onClose={() => {
              setCancelling(false);
              onReturnToList?.();
            }}
            onUpdate={(updated) => {
              setState(updated);
              if (session?.role === 'customer') updateDemoBooking(session.accountId, updated);
            }}
          />
        </Modal>
        <View pointerEvents="none" style={{ position: 'absolute', left: -2000, top: 0 }}>
          <DownloadableTicket ref={ticketRef} state={activeState} />
          <View
            ref={qrRef}
            collapsable={false}
            style={{
              width: 600,
              height: 650,
              padding: 30,
              backgroundColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <LocalQr
              payload={JSON.stringify({ version: 1, ticketCode: code, signature: `mock:${code}` })}
              size={540}
            />
            <Text style={s.body}>{code}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
