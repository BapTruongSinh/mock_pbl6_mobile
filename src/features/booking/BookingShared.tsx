import { tripDuration } from './bookingModel';
import type { SearchTrip } from '../search/searchModel';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { bookingAssets as a } from './bookingAssets';
import { bookingStyles as s } from './booking.styles';
export function BookingBackground(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="bookingSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4063E0" />
            <Stop offset="0.23" stopColor="#809CFA" />
            <Stop offset="0.47" stopColor="#E8F0FF" />
            <Stop offset="0.68" stopColor="#FBFCFF" />
            <Stop offset="1" stopColor="white" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bookingSky)" />
      </Svg>
      <Image
        source={a.glow}
        style={{ width: 344, height: 304, position: 'absolute', top: -132, alignSelf: 'center' }}
        resizeMode="contain"
      />
    </View>
  );
}
export function BookingHeader({
  title,
  onBack,
  blue = false,
  status,
}: {
  title: string;
  onBack: () => void;
  blue?: boolean;
  status?: number;
}): React.ReactElement {
  return (
    <View style={[s.header, blue && s.blueHeader]}>
      <Pressable
        testID="booking.back"
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        hitSlop={6}
      >
        {blue ? (
          <View style={s.round}>
            <Image source={a.chevronLeft} style={{ width: 18, height: 18 }} />
          </View>
        ) : (
          <Image source={a.back} style={{ width: 40, height: 40 }} />
        )}
      </Pressable>
      <Text style={[s.headerTitle, blue && s.whiteTitle]}>{title}</Text>
      {blue ? (
        <View style={status ? s.round : { width: 38, height: 38 }}>
          {status && <Image source={status} style={{ width: 18, height: 18 }} />}
        </View>
      ) : (
        <Image source={a.logo} style={s.logo} resizeMode="contain" />
      )}
    </View>
  );
}
export function PrimaryButton({
  label,
  onPress,
  testID,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[s.button, disabled && s.disabled]}
      onPress={onPress}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
export function TripHeading({
  trip,
  time = '10:30',
  reference = 'NK118',
  showDetails = true,
}: {
  trip?: SearchTrip;
  time?: string;
  reference?: string;
  showDetails?: boolean;
}): React.ReactElement {
  return (
    <>
      <View style={s.spread}>
        <Image source={a.logo} style={s.logo} resizeMode="contain" />
        <Text style={s.small}>{trip?.id ?? reference}</Text>
      </View>
      <View style={s.row}>
        <View style={s.route}>
          <Text style={s.routeTitle}>TP.HCM</Text>
          <Text style={s.small}>Hồ Chí Minh</Text>
        </View>
        <View style={s.routeCenter}>
          <Image source={a.route} style={{ width: 94, height: 24 }} resizeMode="contain" />
          <Text style={s.small}>
            {tripDuration(trip?.departure ?? time, trip?.arrival ?? '16:45')}
          </Text>
        </View>
        <View style={s.route}>
          <Text style={[s.routeTitle, s.right]}>Lâm Đồng</Text>
          <Text style={[s.small, s.right]}>Lâm Đồng</Text>
        </View>
      </View>
      {showDetails && (
        <View style={s.detailGrid}>
          {[
            ['Loại xe', trip?.vehicle ?? 'Giường nằm 34 chỗ'],
            ['Khởi hành', `28/08 · ${trip?.departure ?? time}`],
          ].map(([k, v]) => (
            <View key={k} style={s.detail}>
              <Text style={s.small}>{k}</Text>
              <Text style={s.body}>{v}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
