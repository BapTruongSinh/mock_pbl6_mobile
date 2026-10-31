import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  filterTrips,
  INITIAL_FILTERS,
  SEARCH_TRIPS,
  VEHICLES,
  type SearchFilters,
} from './searchModel';
import { SearchIcon, searchAssets } from './searchAssets';
import { searchStyles as s } from './search.styles';
const SORTS: [string, string][] = [
  ['early', 'Khởi hành sớm nhất'],
  ['late', 'Khởi hành muộn nhất'],
  ['price-low', 'Giá thấp nhất'],
  ['price-high', 'Giá cao nhất'],
];
const PERIODS: [string, string][] = [
  ['', 'Sáng · Chiều · Tối'],
  ['morning', 'Sáng (00:00–11:59)'],
  ['afternoon', 'Chiều (12:00–17:59)'],
  ['evening', 'Tối (18:00–23:59)'],
];
type Section = 'sort' | 'period' | 'time' | 'vehicle' | 'operator' | 'stops' | 'price';
export function SearchFilterSheet({
  initial,
  onApply,
  onClose,
  initialSection = null,
}: {
  initial: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
  initialSection?: Section | null;
}): React.ReactElement {
  const [draft, setDraft] = useState({ ...initial });
  const [section, setSection] = useState<Section | null>(initialSection);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const count = filterTrips(SEARCH_TRIPS, draft).length;
  const error =
    draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)
      ? 'Nhập giờ hợp lệ theo HH:mm.'
      : draft.minFare && draft.maxFare && Number(draft.minFare) > Number(draft.maxFare)
        ? 'Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.'
        : null;
  function set(key: keyof SearchFilters, value: string): void {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  const rows: [Section, string, string][] = [
    ['sort', 'Sắp xếp', SORTS.find((x) => x[0] === draft.sort)?.[1] ?? ''],
    ['period', 'Buổi khởi hành', PERIODS.find((x) => x[0] === draft.period)?.[1] ?? ''],
    ['time', 'Giờ khởi hành', draft.time || 'Chọn giờ'],
    ['vehicle', 'Loại xe', draft.vehicle || 'Lựa chọn phù hợp'],
    ['operator', 'Nhà xe', draft.operator || 'Tất cả nhà xe'],
    [
      'stops',
      'Điểm đón / trả',
      [draft.pickup, draft.dropoff].filter(Boolean).join(' → ') || 'Tất cả điểm',
    ],
    [
      'price',
      'Khoảng giá',
      draft.minFare || draft.maxFare
        ? `${draft.minFare || '0'} – ${draft.maxFare || 'Không giới hạn'} đ`
        : 'Không giới hạn',
    ],
  ];
  function options(key: keyof SearchFilters, items: [string, string][]): React.ReactNode {
    return items.map(([value, label]) => (
      <Pressable
        key={value}
        accessibilityRole="radio"
        accessibilityState={{ checked: draft[key] === value }}
        style={[s.option, draft[key] === value && s.optionActive]}
        onPress={() => set(key, value)}
      >
        <Text style={s.optionText}>{label}</Text>
      </Pressable>
    ));
  }
  function input(key: keyof SearchFilters, label: string, placeholder: string): React.ReactNode {
    return (
      <View>
        <Text style={s.inputLabel}>{label}</Text>
        <TextInput
          testID={`search.filter.${key}`}
          accessibilityLabel={label}
          style={s.input}
          value={draft[key]}
          onChangeText={(v) => set(key, key === 'time' ? v : v.replace(/\D/g, ''))}
          keyboardType={key === 'time' ? 'numbers-and-punctuation' : 'numeric'}
          placeholder={placeholder}
          placeholderTextColor="#8491A7"
          maxLength={key === 'time' ? 5 : 9}
        />
      </View>
    );
  }
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.scrim}>
        <Pressable accessibilityLabel="Đóng bộ lọc" style={{ flex: 1 }} onPress={onClose} />
        <View
          style={[
            s.sheet,
            {
              maxHeight: height - insets.top - 20,
              paddingBottom: Math.max(24, insets.bottom + 12),
            },
          ]}
          testID="screen.FIGMA-486-279"
        >
          <View style={s.handle} />
          <View style={s.sheetHeading}>
            <Text style={s.title}>
              {section ? rows.find((r) => r[0] === section)?.[1] : 'Bộ lọc chuyến xe'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section ? 'Quay lại bộ lọc' : 'Đóng bộ lọc'}
              hitSlop={8}
              onPress={() => (section ? setSection(null) : onClose())}
            >
              <SearchIcon source={searchAssets.close} width={34} />
            </Pressable>
          </View>
          <Text style={s.subtitle}>{count} chuyến phù hợp</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.rows}>
            {!section &&
              rows.map(([key, label, value]) => (
                <Pressable
                  key={key}
                  testID={`search.filter.row.${key}`}
                  accessibilityRole="button"
                  style={s.filterRow}
                  onPress={() => setSection(key)}
                >
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{label}</Text>
                    <Text style={s.rowValue}>{value}</Text>
                  </View>
                  <SearchIcon source={searchAssets.chevron} width={5} height={10} />
                </Pressable>
              ))}
            {section === 'sort' && options('sort', SORTS)}
            {section === 'period' && options('period', PERIODS)}
            {section === 'vehicle' &&
              options('vehicle', [
                ['', 'Tất cả 15 loại xe'],
                ...VEHICLES.map((v): [string, string] => [v, v]),
              ])}
            {section === 'operator' &&
              options('operator', [
                ['', 'Tất cả nhà xe'],
                ...Array.from(new Set(SEARCH_TRIPS.map((t) => t.operator))).map(
                  (v): [string, string] => [v, v],
                ),
              ])}
            {section === 'time' && (
              <>
                <Text style={s.inputLabel}>
                  Chỉ hiển thị chuyến khởi hành đúng giờ đã chọn. Để trống để xem tất cả.
                </Text>
                {input('time', 'Giờ khởi hành (HH:mm)', '07:30')}
              </>
            )}
            {section === 'price' && (
              <>
                {input('minFare', 'Giá tối thiểu (đ)', '0')}
                {input('maxFare', 'Giá tối đa (đ)', 'Không giới hạn')}
              </>
            )}
            {section === 'stops' && (
              <>
                <Text style={s.inputLabel}>Điểm đón</Text>
                {options('pickup', [
                  ['', 'Tất cả điểm đón'],
                  ...Array.from(new Set(SEARCH_TRIPS.map((t) => t.pickup))).map(
                    (v): [string, string] => [v, v],
                  ),
                ])}
                <Text style={s.inputLabel}>Điểm trả</Text>
                {options('dropoff', [
                  ['', 'Tất cả điểm trả'],
                  ...Array.from(new Set(SEARCH_TRIPS.map((t) => t.dropoff))).map(
                    (v): [string, string] => [v, v],
                  ),
                ])}
              </>
            )}
          </ScrollView>
          {error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <View style={s.footer}>
            <Pressable
              testID="search.filter.reset"
              accessibilityRole="button"
              style={s.reset}
              onPress={() => setDraft({ ...INITIAL_FILTERS })}
            >
              <Text style={s.resetText}>Đặt lại</Text>
            </Pressable>
            <Pressable
              testID="search.filter.apply"
              accessibilityRole="button"
              accessibilityState={{ disabled: !!error }}
              disabled={!!error}
              style={[s.apply, error && { opacity: 0.5 }]}
              onPress={() => onApply(draft)}
            >
              <Text style={s.applyText}>Áp dụng · {count} chuyến</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
