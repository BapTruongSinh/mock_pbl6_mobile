import { bookingTrip } from './bookingModel';
import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { bookingAssets as a } from './bookingAssets';
import { LocalQr } from './LocalQr';
import type { BookingState } from './bookingModel';
import { typography } from '../../shared/theme/tokens';
export const DownloadableTicket = forwardRef<View, { state: BookingState }>(
  function DownloadableTicket({ state }, ref) {
    const code = `${bookingTrip(state).id}-DEMO-${state.seats.join('-')}`;
    return (
      <View ref={ref} collapsable={false} style={s.ticket}>
        <View style={s.header}>
          <Image source={a.logo} style={{ width: 80, height: 30 }} resizeMode="contain" />
          <Text style={s.green}>ĐÃ PHÁT HÀNH · VÉ MÔ PHỎNG</Text>
          <Text style={[s.label, { marginLeft: 'auto' }]}>CHUYẾN {bookingTrip(state).id}</Text>
        </View>
        <Text style={s.title}>TP. Hồ Chí Minh → Lâm Đồng</Text>
        <Text style={s.text}>Thứ Sáu, 28/08/2026 · Khởi hành {bookingTrip(state).departure}</Text>
        <View style={s.body}>
          <View style={s.left}>
            <Text style={s.blue}>LỘ TRÌNH</Text>
            <View style={s.route}>
              <View>
                <Text style={s.time}>{bookingTrip(state).departure}</Text>
                <Text style={s.text}>Bến xe Miền Đông mới</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={s.text}>6 giờ 15 · Đi thẳng</Text>
                <Image source={a.route} style={{ width: 180, height: 44 }} resizeMode="contain" />
              </View>
              <View>
                <Text style={s.time}>{bookingTrip(state).arrival}</Text>
                <Text style={s.text}>Lâm Đồng</Text>
              </View>
            </View>
            <View style={s.grid}>
              {[
                ['NHÀ XE KHAI THÁC', bookingTrip(state).operator],
                ['GHẾ', state.seats.join(', ')],
                ['HÀNH KHÁCH', state.seats.map((id) => state.passengers[id]?.fullName).join(' · ')],
                ['ĐIỂM ĐÓN', state.pickup],
                ['ĐIỂM TRẢ', state.dropoff],
              ].map(([key, value]) => (
                <View key={key} style={s.cell}>
                  <Text style={s.label}>{key}</Text>
                  <Text style={s.value}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={s.ready}>
              <Text style={s.green}>Sẵn sàng để quét</Text>
              <Text style={s.text}>Có mặt trước giờ khởi hành, chuẩn bị giấy tờ cần thiết.</Text>
            </View>
            <Text style={s.text}>Vé và QR chỉ phục vụ bản mô phỏng BLUE Mobile.</Text>
          </View>
          <View style={s.qr}>
            <Text style={s.blue}>QUÉT KHI LÊN XE</Text>
            <LocalQr
              payload={JSON.stringify({ version: 1, ticketCode: code, signature: `mock:${code}` })}
              size={210}
            />
            <Text style={s.value}>{code}</Text>
            <Text style={s.text}>Nếu QR không quét được, đọc mã vé cho nhân viên.</Text>
          </View>
        </View>
      </View>
    );
  },
);
const f = typography.fontFamily;
const s = StyleSheet.create({
  ticket: {
    width: 1100,
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 30,
    borderTopWidth: 3,
    borderColor: '#246BEB',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 16 },
  title: { fontFamily: f.bold, fontSize: 30, color: '#0B1F3A', marginBottom: 8 },
  text: { fontFamily: f.regular, fontSize: 12, color: '#637894' },
  green: { fontFamily: f.semiBold, fontSize: 12, color: '#159265' },
  blue: { fontFamily: f.semiBold, fontSize: 11, color: '#246BEB' },
  label: { fontFamily: f.medium, fontSize: 10, color: '#7487A3' },
  body: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#E2EAF5', marginTop: 18 },
  left: { flex: 1, paddingTop: 24, paddingRight: 28, gap: 20 },
  route: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#E2EAF5',
  },
  time: { fontFamily: f.bold, fontSize: 30, color: '#0B1F3A', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  cell: { width: '46%', gap: 8 },
  value: { fontFamily: f.semiBold, fontSize: 13, color: '#0B1F3A' },
  ready: { backgroundColor: '#ECF8F2', borderRadius: 12, padding: 16, gap: 8 },
  qr: {
    width: 270,
    padding: 20,
    backgroundColor: '#F5F9FF',
    alignItems: 'center',
    gap: 16,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C5D5EB',
  },
});
