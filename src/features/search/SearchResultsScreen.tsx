import {
  TripSearchPickers,
  DEFAULT_SELECTION,
  type TripSelection,
} from '../../shared/components/TripSearchPickers';
import { CustomerBottomNav } from '../../shared/components/CustomerBottomNav';
import React, { useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  INITIAL_FILTERS,
  SEARCH_TRIPS,
  filterTrips,
  formatFare,
  type SearchTrip,
} from './searchModel';
import { SearchFilterSheet } from './SearchFilterSheet';
import { SearchIcon, searchAssets as a } from './searchAssets';
import { searchStyles as s } from './search.styles';
function TripCard({
  trip,
  onSelect,
}: {
  trip: SearchTrip;
  onSelect?: (id: string) => void;
}): React.ReactElement {
  const [geometry, setGeometry] = useState({ width: 350, height: 154 });
  return (
    <Pressable
      testID={`search.trip.${trip.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${trip.operator}, ${trip.departure}, ${trip.vehicle}, ${formatFare(trip.fare)}`}
      onPress={() =>
        onSelect
          ? onSelect(trip.id)
          : Alert.alert(
              'Chọn chuyến',
              `Bạn đã chọn chuyến ${trip.id}. Màn hình chọn chỗ sẽ được bổ sung ở bước tiếp theo.`,
            )
      }
      onLayout={(event) =>
        setGeometry({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
      style={s.card}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={a.background}
          style={{
            width: geometry.width,
            height: geometry.height,
          }}
          resizeMode="stretch"
        />
      </View>
      <View style={s.cardTop}>
        {trip.operator === 'BLUE Express' ? (
          <Image source={a.logo} style={{ width: 78, height: 24 }} resizeMode="contain" />
        ) : (
          <>
            <View style={[s.mark, { backgroundColor: trip.color }]}>
              <Text style={s.markText}>{trip.initials}</Text>
            </View>
            <Text style={s.operator}>{trip.operator}</Text>
          </>
        )}
        {trip.id === 'BL201' && (
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={s.recommend}>
              <Text style={s.recommendText}>Đề xuất</Text>
            </View>
          </View>
        )}
      </View>
      <View style={s.tripRow}>
        <View style={s.endpoint}>
          <Text style={s.time}>{trip.departure}</Text>
          <Text style={s.city}>TP.HCM</Text>
          <Text style={s.stop}>{trip.pickup}</Text>
        </View>
        <View style={s.connector}>
          <View style={s.line}>
            <SearchIcon source={a.line} width={102} height={2} />
          </View>
          <SearchIcon source={a.bus} width={26} height={17} />
          <View style={s.seat}>
            <Text style={s.seatText}>Còn {trip.seats} chỗ</Text>
          </View>
        </View>
        <View style={[s.endpoint, s.right]}>
          <Text style={s.time}>{trip.arrival}</Text>
          <Text style={s.city}>Lâm Đồng</Text>
          <Text style={s.stop}>{trip.dropoff}</Text>
        </View>
      </View>
      <SearchIcon source={a.divider} width="100%" height={1} />
      <View style={s.bottomRow}>
        <Text style={s.tripId}>{trip.id}</Text>
        <Text style={s.vehicle}>{trip.vehicle}</Text>
        <Text style={s.fare}>{formatFare(trip.fare)}</Text>
      </View>
    </Pressable>
  );
}
export function SearchResultsScreen({
  onBack,
  onHome,
  onTickets,
  onAccount,
  onSelectTrip,
  initialFilterOpen = false,
  initialSelection,
}: {
  onBack?: () => void;
  onHome?: () => void;
  onTickets?: () => void;
  onAccount?: () => void;
  onSelectTrip?: (tripId: string) => void;
  initialFilterOpen?: boolean;
  initialSelection?: TripSelection;
}): React.ReactElement {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [sheet, setSheet] = useState<'all' | 'vehicle' | null>(initialFilterOpen ? 'all' : null);
  const [selection, setSelection] = useState(initialSelection ?? { ...DEFAULT_SELECTION });
  const [picker, setPicker] = useState<'origin' | 'destination' | 'date' | null>(null);
  const available =
    selection.origin === 'Hồ Chí Minh' && selection.destination === 'Lâm Đồng' ? SEARCH_TRIPS : [];
  const trips = filterTrips(available, filters);
  return (
    <View style={s.root} testID="screen.FIGMA-31-44">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="searchSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4063E0" />
              <Stop offset="0.23" stopColor="#809CFA" />
              <Stop offset="0.47" stopColor="#E8F0FF" />
              <Stop offset="0.68" stopColor="#FBFCFF" />
              <Stop offset="1" stopColor="white" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#searchSky)" />
        </Svg>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.content}>
          <View style={s.header}>
            <Image
              source={a.glow}
              style={{
                position: 'absolute',
                width: 344,
                height: 304,
                top: -144,
                alignSelf: 'center',
              }}
              resizeMode="contain"
            />
            <View style={s.routeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={onBack}
                hitSlop={8}
              >
                <SearchIcon source={a.back} width={36} />
              </Pressable>
              <View style={s.route}>
                <View style={s.routeCities}>
                  <Pressable
                    testID="search.origin"
                    accessibilityRole="button"
                    onPress={() => setPicker('origin')}
                    style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={s.white}>{selection.origin}</Text>
                  </Pressable>
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <View style={{ position: 'absolute', top: 8 }}>
                      <SearchIcon source={a.headerLine} width={80} height={2} />
                    </View>
                    <SearchIcon source={a.headerBus} width={26} height={17} />
                  </View>
                  <Pressable
                    testID="search.destination"
                    accessibilityRole="button"
                    onPress={() => setPicker('destination')}
                    style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={s.white}>{selection.destination}</Text>
                  </Pressable>
                </View>
                <Pressable
                  testID="search.date"
                  accessibilityRole="button"
                  onPress={() => setPicker('date')}
                >
                  <Text style={s.count}>
                    {trips.length} chuyến · {selection.departureDate.split('-').reverse().join('/')}
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="search.filters"
              onPress={() => setSheet('all')}
              style={s.filterButton}
            >
              <View style={{ gap: 3, alignItems: 'center' }}>
                {[15, 10, 5].map((w) => (
                  <View key={w} style={{ width: w, height: 1.5, backgroundColor: 'white' }} />
                ))}
              </View>
              <Text style={s.filterLabel}>Bộ lọc</Text>
              <SearchIcon source={a.catalogChevron} width={10} height={7} />
            </Pressable>
            <Pressable
              testID="search.vehicle"
              accessibilityRole="button"
              onPress={() => setSheet('vehicle')}
              style={s.catalog}
            >
              <View style={s.catalogText}>
                <Text style={s.label}>DANH MỤC XE</Text>
                <Text style={s.value}>{filters.vehicle || 'Tất cả 15 loại xe'}</Text>
              </View>
              <SearchIcon source={a.catalogChevron} width={10} height={7} />
            </Pressable>
          </View>
          <FlatList
            data={trips}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TripCard trip={item} onSelect={onSelectTrip} />}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>
                  {available.length
                    ? 'Không có chuyến phù hợp với bộ lọc.'
                    : 'Chưa có dữ liệu chuyến mô phỏng cho tuyến đã chọn.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFilters({ ...INITIAL_FILTERS })}
                >
                  <Text style={s.link}>Xóa bộ lọc</Text>
                </Pressable>
              </View>
            }
          />
          <View style={{ paddingHorizontal: 16 }}>
            <CustomerBottomNav
              active="search"
              onNavigate={(tab) =>
                tab === 'home'
                  ? onHome?.()
                  : tab === 'tickets'
                    ? onTickets?.()
                    : tab === 'account'
                      ? onAccount?.()
                      : undefined
              }
            />
          </View>
        </View>
      </SafeAreaView>
      <TripSearchPickers
        field={picker}
        value={selection}
        onSelect={setSelection}
        onClose={() => setPicker(null)}
      />
      {sheet && (
        <SearchFilterSheet
          initial={filters}
          initialSection={sheet === 'vehicle' ? 'vehicle' : null}
          onClose={() => setSheet(null)}
          onApply={(next) => {
            setFilters(next);
            setSheet(null);
          }}
        />
      )}
    </View>
  );
}
