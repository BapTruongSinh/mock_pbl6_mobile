import { bookingTrip, seatsForTrip } from './bookingModel';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { bookingStyles as s } from './booking.styles';
import { remainingHold, type BookingState, type BookingAction } from './bookingModel';
import { formatFare } from '../search/searchModel';
import { PrimaryButton } from './BookingShared';
export function SeatMapScreen({
  state,
  dispatch,
  now,
  onContinue,
}: {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  now: number;
  onContinue: () => void;
}): React.ReactElement {
  const allSeats = seatsForTrip(state.trip);
  const floors = [...new Set(allSeats.map((s) => s.floor))];
  const [floor, setFloor] = useState(floors.includes('B') ? 'B' : 'A');
  const { width } = useWindowDimensions();
  const seatWidth = Math.min(48, Math.floor((Math.min(width, 600) - 122) / 5));
  function seat(id: string): React.ReactNode {
    const model = allSeats.find((x) => x.id === id);
    const selected = state.seats.includes(id);
    const disabled = model?.status !== 'available';
    return (
      <Pressable
        key={id}
        testID={`booking.seat.${id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={`Ghế ${id}${disabled ? (model?.status === 'held' ? ', đang giữ' : ', đã có người') : ''}`}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={() => dispatch({ type: 'toggle', seatId: id, now })}
        style={[
          s.seat,
          { width: seatWidth },
          selected && s.seatSelected,
          model?.status === 'held' && s.seatHeld,
          model?.status === 'occupied' && s.seatOccupied,
        ]}
      >
        <View
          style={[
            s.bar,
            selected && { backgroundColor: '#9EC4FF' },
            model?.status === 'held' && { backgroundColor: '#F0A614' },
            model?.status === 'occupied' && { backgroundColor: '#C7D1DE' },
          ]}
        />
        <Text
          style={[s.seatLabel, selected && { color: 'white' }, disabled && { color: '#99A8BD' }]}
        >
          {id}
        </Text>
      </Pressable>
    );
  }
  return (
    <>
      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: 16, paddingTop: 0 }]}>
        <View style={s.strip}>
          <View style={s.flex}>
            <Text style={s.body}>TP.HCM → Lâm Đồng</Text>
            <Text style={s.small}>{bookingTrip(state).departure} · Thứ Sáu, 28/08/2026</Text>
          </View>
          <View>
            <Text style={[s.small, { color: '#1F63E8' }, s.right]}>
              {bookingTrip(state).operator}
            </Text>
            <Text style={[s.small, s.right]}>Miền Đông → Lâm Đồng</Text>
          </View>
        </View>
        <View style={[s.card, { minHeight: 508 }]} testID="screen.FIGMA-31-89">
          <View style={s.spread}>
            <Text style={[s.title, { flex: 1 }]}>{bookingTrip(state).vehicle}</Text>
            <View style={s.chip}>
              <Text style={s.chipText}>{state.seats.length}/6 chỗ đã chọn</Text>
            </View>
          </View>
          <View style={s.legend}>
            {[
              ['Trống', 'white'],
              ['Đang chọn', '#1F63E8'],
              ['Đang giữ', '#FFF2C2'],
              ['Đã có người', '#E8EDF5'],
            ].map(([label, color]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendSquare, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={s.row}>
            {floors.map((f) => (
              <Pressable
                key={f}
                testID={`booking.floor.${f}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: floor === f }}
                style={[s.floor, floor === f && s.floorActive]}
                onPress={() => setFloor(f)}
              >
                <Text style={[s.floorText, floor === f && s.floorActiveText]}>
                  {f === 'A' ? 'Tầng dưới' : 'Tầng trên'} · {f}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.small}>
            {bookingTrip(state).vehicle.includes('giường') ||
            bookingTrip(state).vehicle.includes('Giường')
              ? 'Sơ đồ giường nằm mô phỏng'
              : 'Sơ đồ ghế ngồi mô phỏng'}
          </Text>
          <View
            style={[
              s.seatGrid,
              { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
            ]}
          >
            {allSeats.filter((x) => x.floor === floor).map((x) => seat(x.id))}
          </View>
        </View>
      </ScrollView>
      <View style={s.summary}>
        <View style={s.spread}>
          <Text style={s.small}>Đang giữ ghế</Text>
          <Text testID="booking.timer" style={s.timer}>
            {remainingHold(state.expiresAt, now)}
          </Text>
        </View>
        <View style={s.spread}>
          <Text style={s.small}>
            Ghế <Text style={s.body}>{state.seats.join(', ') || 'Chưa chọn'}</Text>
          </Text>
          <Text style={s.small}>
            Tổng cộng{' '}
            <Text style={[s.body, s.bold]}>
              {formatFare(state.seats.length * bookingTrip(state).fare)}
            </Text>
          </Text>
        </View>
        {state.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {state.error}
          </Text>
        )}
        <PrimaryButton
          testID="booking.seats.continue"
          label="Tiếp tục"
          onPress={onContinue}
          disabled={!state.seats.length}
        />
      </View>
    </>
  );
}
