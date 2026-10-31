import {
  TripSearchPickers,
  DEFAULT_SELECTION,
  type TripSelection,
} from '../../shared/components/TripSearchPickers';
/* eslint-disable @typescript-eslint/no-require-imports */
import { CustomerBottomNav } from '../../shared/components/CustomerBottomNav';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop, SvgUri } from 'react-native-svg';
import { useLocalWeather } from './useLocalWeather';
import { homeStyles as styles } from './home.styles';
const assets = {
  logo: require('../../shared/assets/home/logo.png') as number,
  glow: require('../../shared/assets/home/glow.png') as number,
  bus: require('../../shared/assets/home/bus.png') as number,
  daLat: require('../../shared/assets/home/da-lat.png') as number,
  saPa: require('../../shared/assets/home/sa-pa.png') as number,
  hue: require('../../shared/assets/home/hue.png') as number,
  bell: require('../../shared/assets/home/bell.svg') as number,
  badge: require('../../shared/assets/home/badge.svg') as number,
  origin: require('../../shared/assets/home/origin.svg') as number,
  destination: require('../../shared/assets/home/destination.svg') as number,
  date: require('../../shared/assets/home/date.svg') as number,
  swap: require('../../shared/assets/home/swap.svg') as number,
  calendar: require('../../shared/assets/home/calendar.svg') as number,
  home: require('../../shared/assets/home/home.svg') as number,
  search: require('../../shared/assets/home/search.svg') as number,
  journey: require('../../shared/assets/home/journey.svg') as number,
  ticket: require('../../shared/assets/home/ticket.svg') as number,
  account: require('../../shared/assets/home/account.svg') as number,
};
function Icon({ source, size = 20 }: { source: number; size?: number }): React.ReactElement {
  return <SvgUri uri={Image.resolveAssetSource(source).uri} width={size} height={size} />;
}
const recommendations = [
  {
    id: 'da-lat',
    route: 'TP.HCM → Lâm Đồng',
    date: '28/08',
    price: '280.000đ',
    image: assets.daLat,
  },
  { id: 'sa-pa', route: 'Hà Nội → Sa Pa', date: '30/08', price: '320.000đ', image: assets.saPa },
  { id: 'hue', route: 'Đà Nẵng → Huế', date: '01/09', price: '150.000đ', image: assets.hue },
];
function pending(title: string): void {
  Alert.alert(title, 'Màn hình này sẽ được bổ sung ở bước tiếp theo.');
}
export function CustomerHomeScreen({
  onSearch,
  onTickets,
  onAccount,
}: {
  onSearch?: (selection?: TripSelection) => void;
  onTickets?: () => void;
  onAccount?: () => void;
}): React.ReactElement {
  const { width, fontScale } = useWindowDimensions();
  const { weather, refresh: refreshWeather } = useLocalWeather();
  const [selection, setSelection] = useState({ ...DEFAULT_SELECTION });
  const [picker, setPicker] = useState<'origin' | 'destination' | 'date' | null>(null);
  const origin = selection.origin,
    destination = selection.destination;
  const openSearch = (): void => onSearch?.(selection);
  const [filter, setFilter] = useState('Tất cả');
  return (
    <View style={styles.root} testID="screen.FIGMA-31-2">
      <View pointerEvents="none" style={styles.skyBackground}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="homeSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#63C2F5" />
              <Stop offset="1" stopColor="#F5FAFF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#homeSky)" />
        </Svg>
        <View style={{ position: 'absolute', top: -19, left: width / 2 - 195 }}>
          <Image source={assets.glow} style={{ width: 390, height: 300 }} resizeMode="contain" />
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.top}>
              <Image
                source={assets.logo}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logo chính thức BLUE"
              />
              <Pressable
                style={styles.square}
                accessibilityRole="button"
                testID="home.account"
                accessibilityLabel="Tài khoản Minh Anh"
                onPress={() => onAccount?.()}
              >
                <Text style={styles.initials}>MA</Text>
              </Pressable>
            </View>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>Chào Minh Anh</Text>
                <Text style={styles.intro}>Hôm nay bạn muốn đi đâu?</Text>
              </View>
              <Pressable
                style={styles.weather}
                accessibilityRole="button"
                accessibilityLabel="Cập nhật thời tiết theo vị trí"
                onPress={refreshWeather}
              >
                <Text style={{ color: '#FF941F', fontSize: 13 }}>
                  {weather ? (weather.description === 'Trời đẹp' ? '☀' : '☁') : '—'}
                </Text>
                <Text style={styles.weatherText}>
                  {weather ? `${weather.temperature}°C` : '--°C'}
                </Text>
                <Text style={styles.weatherNote}>· {weather?.description ?? '---'}</Text>
              </Pressable>
            </View>
            <View style={[styles.quick, (width < 360 || fontScale > 1.3) && styles.quickReflow]}>
              <View style={styles.routeFields} testID="home.routeFields" collapsable={false}>
                {[
                  { label: 'Điểm đi', value: origin, icon: assets.origin },
                  { label: 'Điểm đến', value: destination, icon: assets.destination },
                ].map((field) => (
                  <Pressable
                    key={field.label}
                    testID={
                      field.label === 'Điểm đi' ? 'home.originField' : 'home.destinationField'
                    }
                    collapsable={false}
                    style={styles.field}
                    accessibilityRole="button"
                    onPress={() => setPicker(field.label === 'Điểm đi' ? 'origin' : 'destination')}
                  >
                    <Icon source={field.icon} />
                    <View style={styles.fieldText}>
                      <Text style={styles.label}>{field.label}</Text>
                      <Text style={styles.value}>{field.value}</Text>
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.swap}
                  accessibilityRole="button"
                  accessibilityLabel="Đổi điểm đi và điểm đến"
                  testID="home.swap"
                  onPress={() => {
                    setSelection({ ...selection, origin: destination, destination: origin });
                  }}
                >
                  <Icon source={assets.swap} size={16} />
                </Pressable>
              </View>
              <Pressable
                style={styles.date}
                accessibilityRole="button"
                testID="home.dateField"
                onPress={() => setPicker('date')}
              >
                <Icon source={assets.date} />
                <Text style={styles.label}>Ngày đi</Text>
                <Text style={styles.dateValue}>
                  {selection.departureDate.slice(8) + '.' + selection.departureDate.slice(5, 7)}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.upcoming}
              accessibilityRole="button"
              onPress={() => pending('Chi tiết hành trình')}
            >
              <Image source={assets.bus} style={styles.bus} resizeMode="cover" />
              <View style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="busBlend" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#123CA3" />
                      <Stop offset="0.45" stopColor="#123CA3" stopOpacity={0.97} />
                      <Stop offset="0.8" stopColor="#123CA3" stopOpacity={0.2} />
                      <Stop offset="1" stopColor="#123CA3" stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#busBlend)" />
                </Svg>
              </View>
              <View style={styles.tripContent}>
                <View style={styles.tripTop}>
                  <View style={styles.tripLogo}>
                    <Image source={assets.logo} style={styles.tripLogoImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.operator}>BLUE Express</Text>
                  <Text style={styles.recommend}>ĐỀ XUẤT</Text>
                </View>
                <Text style={styles.tripTitle}>TP.HCM → Lâm Đồng</Text>
                <Text style={styles.tripInfo}>Thứ Sáu, 28/08 · 07:30</Text>
                <Text style={styles.tripInfo}>Ghế A01 · Cổng 3</Text>
              </View>
            </Pressable>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gợi ý hành trình</Text>
              <Pressable accessibilityRole="button" onPress={openSearch}>
                <Text style={styles.link}>Xem tất cả</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              contentContainerStyle={styles.filters}
              showsHorizontalScrollIndicator={false}
            >
              {['Tất cả', 'Cuối tuần', 'Cảnh đẹp'].map((item) => (
                <Pressable
                  key={item}
                  style={[styles.filter, filter === item && styles.filterActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item }}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[styles.filterText, filter === item && styles.filterActiveText]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              contentContainerStyle={styles.carousel}
              showsHorizontalScrollIndicator={false}
            >
              {recommendations.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.destinationCard}
                  accessibilityRole="button"
                  onPress={() => pending(item.route)}
                >
                  <Image source={item.image} style={styles.destinationImage} resizeMode="cover" />
                  <Text style={styles.destinationTitle}>{item.route}</Text>
                  <View style={styles.priceRow}>
                    <Icon source={assets.calendar} size={14} />
                    <Text style={styles.price}>
                      {item.date} · từ {item.price}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 20 }}>
          <CustomerBottomNav
            active="home"
            onNavigate={(tab) =>
              tab === 'search'
                ? openSearch()
                : tab === 'tickets'
                  ? onTickets?.()
                  : tab === 'account'
                    ? onAccount?.()
                    : undefined
            }
          />
        </View>
      </SafeAreaView>
      <TripSearchPickers
        field={picker}
        value={selection}
        onSelect={setSelection}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}
