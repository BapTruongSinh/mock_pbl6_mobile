import { bookingTrip } from './bookingModel';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { bookingStyles as s } from './booking.styles';
import { bookingAssets as a } from './bookingAssets';
import {
  remainingHold,
  validatePassengers,
  type BookingState,
  type BookingAction,
} from './bookingModel';
import { PrimaryButton, TripHeading } from './BookingShared';
export function PassengerScreen({
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
  const [geometry, setGeometry] = useState({ width: 334, height: 590 });
  const [editing, setEditing] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<'pickup' | 'dropoff' | null>(null);
  function save(): void {
    if (!editing) return;
    const value = { fullName: fullName.trim(), phone: phone.trim() };
    const message = validatePassengers([editing], { [editing]: value });
    if (message) {
      setError(message);
      return;
    }
    dispatch({ type: 'passenger', seatId: editing, value });
    setEditing(null);
  }
  return (
    <>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: 0, paddingHorizontal: 28 }]}
        keyboardShouldPersistTaps="handled"
        testID="screen.FIGMA-37-127"
      >
        <View
          onLayout={(event) =>
            setGeometry({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
          style={[
            s.ticket,
            {
              backgroundColor: 'transparent',
              boxShadow: '0px 12px 28px rgba(10,26,61,0.14)',
              minHeight: 590,
            },
          ]}
        >
          <Image
            source={a.passengerBackground}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: geometry.width,
              height: geometry.height,
            }}
            resizeMode="stretch"
          />
          <TripHeading trip={bookingTrip(state)} />
          <View style={s.detailGrid}>
            <View style={s.detail}>
              <Text style={s.small}>Hành khách</Text>
              <Text style={s.body}>{state.seats.length} người</Text>
            </View>
            <View style={s.detail}>
              <Text style={s.small}>Đến nơi</Text>
              <Text style={s.body}>{bookingTrip(state).arrival} · 28/08</Text>
            </View>
          </View>
          <View style={s.divider} />
          {state.seats.map((id, index) => {
            const p = state.passengers[id];
            return (
              <Pressable
                key={id}
                testID={`booking.passenger.${id}`}
                accessibilityRole="button"
                accessibilityLabel={`Nhập thông tin hành khách ghế ${id}`}
                style={s.passenger}
                onPress={() => {
                  setEditing(id);
                  setFullName(p?.fullName ?? '');
                  setPhone(p?.phone ?? '');
                  setError(null);
                }}
              >
                <View style={s.avatar}>
                  <Image source={a.person} style={{ width: 18, height: 18 }} />
                </View>
                <View style={s.flex}>
                  <Text style={s.body}>{p?.fullName ?? `Hành khách ${index + 1}`}</Text>
                  <Text style={s.small}>{p?.phone ?? 'Bấm để nhập họ tên và số điện thoại'}</Text>
                </View>
                <View>
                  <Text style={[s.small, s.right]}>Ghế</Text>
                  <Text style={[s.body, s.right]}>{id}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={s.divider} />
          {(['pickup', 'dropoff'] as const).map((key) => (
            <Pressable
              key={key}
              testID={`booking.${key}`}
              accessibilityRole="button"
              style={s.field}
              onPress={() => setLocation(key)}
            >
              <Image
                source={key === 'pickup' ? a.pickup : a.dropoff}
                style={{ width: 20, height: 20 }}
              />
              <View style={s.flex}>
                <Text style={s.small}>{key === 'pickup' ? 'Điểm đón' : 'Điểm trả'}</Text>
                <Text style={s.body}>{state[key]}</Text>
              </View>
              <Image source={a.chevronDown} style={{ width: 16, height: 16 }} />
            </Pressable>
          ))}
        </View>
        {state.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {state.error}
          </Text>
        )}
        <View style={{ marginHorizontal: 38 }}>
          <PrimaryButton
            testID="booking.passengers.continue"
            label="TIẾP TỤC"
            onPress={onContinue}
          />
        </View>
        <View style={s.spread}>
          <Text style={s.small}>
            Giữ ghế <Text style={s.body}>{remainingHold(state.expiresAt, now)}</Text>
          </Text>
          <Text style={s.small}>{state.seats.length} ghế đã chọn</Text>
        </View>
        <View style={s.spread}>
          <Text style={s.small}>Mã tạm giữ</Text>
          <Text style={s.small}>NK-DEMO-{state.seats.join('-')}</Text>
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={editing !== null}
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          style={s.modalScrim}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.modal}>
              <Text style={s.title}>Hành khách · Ghế {editing}</Text>
              <Text style={s.label}>Họ và tên</Text>
              <TextInput
                testID="booking.passenger.name"
                accessibilityLabel="Họ và tên hành khách"
                autoCapitalize="words"
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                maxLength={80}
              />
              <Text style={s.label}>Số điện thoại</Text>
              <TextInput
                testID="booking.passenger.phone"
                accessibilityLabel="Số điện thoại hành khách"
                style={s.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="Nhập số điện thoại"
                maxLength={10}
              />
              {error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              <PrimaryButton testID="booking.passenger.save" label="Lưu thông tin" onPress={save} />
              <Pressable accessibilityRole="button" onPress={() => setEditing(null)}>
                <Text style={s.link}>Hủy</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        transparent
        visible={!!location}
        animationType="fade"
        onRequestClose={() => setLocation(null)}
      >
        <View style={s.modalScrim}>
          <View style={s.modal}>
            <Text style={s.title}>{location === 'pickup' ? 'Chọn điểm đón' : 'Chọn điểm trả'}</Text>
            {(location === 'pickup'
              ? ['Bến xe Miền Đông mới · 10:10', 'Bến xe An Sương · 09:45']
              : ['Trung tâm Đà Lạt', 'Bến xe Đà Lạt']
            ).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                style={s.field}
                onPress={() => {
                  if (location) dispatch({ type: 'location', key: location, value });
                  setLocation(null);
                }}
              >
                <Text style={s.body}>{value}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setLocation(null)}>
              <Text style={s.link}>Quay lại</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
