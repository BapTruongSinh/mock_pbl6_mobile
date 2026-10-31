import { typography } from '../theme/tokens';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
export const PROVINCES = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Cần Thơ',
  'Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'Hồ Chí Minh',
  'Huế',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
];
export function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export interface TripSelection {
  origin: string;
  destination: string;
  departureDate: string;
}
export const DEFAULT_SELECTION: TripSelection = {
  origin: 'Hồ Chí Minh',
  destination: 'Lâm Đồng',
  departureDate: '2026-08-28',
};
export function TripSearchPickers({
  field,
  value,
  onSelect,
  onClose,
}: {
  field: 'origin' | 'destination' | 'date' | null;
  value: TripSelection;
  onSelect: (next: TripSelection) => void;
  onClose: () => void;
}): React.ReactElement {
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(
    () => new Date(Math.max(Date.now(), new Date(value.departureDate + 'T12:00:00').getTime())),
  );
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  useEffect(() => {
    if (field) {
      setQuery('');
      setMode('days');
      setMonth(
        new Date(Math.max(Date.now(), new Date(value.departureDate + 'T12:00:00').getTime())),
      );
    }
  }, [field, value.departureDate]);
  const choose = (v: string): void => {
    if (field === 'date') onSelect({ ...value, departureDate: v });
    else if (field) onSelect({ ...value, [field]: v });
    setQuery('');
    onClose();
  };
  const move = (n: number): void =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const y = month.getFullYear(),
    m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  return (
    <Modal visible={field !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.scrim}>
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.row}>
            <Text style={s.title}>
              {field === 'date'
                ? 'Chọn ngày đi'
                : field === 'origin'
                  ? 'Chọn điểm đi'
                  : 'Chọn điểm đến'}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} testID="tripPicker.close">
              <Text style={s.blue}>Đóng</Text>
            </Pressable>
          </View>
          {field !== 'date' ? (
            <>
              <TextInput
                testID="tripPicker.search"
                accessibilityLabel="Tìm tỉnh thành"
                placeholder="Tìm tỉnh/thành phố"
                value={query}
                onChangeText={setQuery}
                style={s.input}
              />
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={PROVINCES.filter((p) => normalizePlace(p).includes(normalizePlace(query)))}
                keyExtractor={(p) => p}
                ListEmptyComponent={<Text style={s.text}>Không tìm thấy tỉnh/thành phố</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    testID={'tripPicker.province.' + PROVINCES.indexOf(item)}
                    style={s.option}
                    onPress={() => choose(item)}
                  >
                    <Text style={s.text}>{item}</Text>
                    {value[field ?? 'origin'] === item && <Text style={s.blue}>Đã chọn</Text>}
                  </Pressable>
                )}
              />
            </>
          ) : (
            <ScrollView>
              <View style={s.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tháng trước"
                  onPress={() => move(-1)}
                >
                  <Text style={s.blue}>Trước</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMode(mode === 'months' ? 'days' : 'months')}
                >
                  <Text style={s.blue}>Tháng {m + 1}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMode(mode === 'years' ? 'days' : 'years')}
                >
                  <Text style={s.blue}>{y}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tháng sau"
                  onPress={() => move(1)}
                >
                  <Text style={s.blue}>Sau</Text>
                </Pressable>
              </View>
              {mode === 'months' ? (
                <View style={s.grid}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Pressable
                      key={i}
                      style={s.cell}
                      onPress={() => {
                        setMonth(new Date(y, i, 1));
                        setMode('days');
                      }}
                    >
                      <Text style={s.text}>{i + 1}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : mode === 'years' ? (
                <View style={s.grid}>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map(
                    (year) => (
                      <Pressable
                        key={year}
                        style={s.cell}
                        onPress={() => {
                          setMonth(new Date(year, m, 1));
                          setMode('days');
                        }}
                      >
                        <Text style={s.text}>{year}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              ) : (
                <>
                  <View style={s.grid}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                      <Text key={d} style={[s.cell, s.text]}>
                        {d}
                      </Text>
                    ))}
                  </View>
                  <View style={s.grid}>
                    {Array.from({ length: offset + days }, (_, i) => {
                      const day = i - offset + 1;
                      const date = localDate(new Date(y, m, day));
                      const disabled = day < 1 || date < localDate();
                      return (
                        <Pressable
                          key={i}
                          disabled={disabled}
                          accessibilityRole="button"
                          accessibilityLabel={date}
                          accessibilityState={{ disabled, selected: value.departureDate === date }}
                          testID={'tripPicker.day.' + date}
                          style={[s.cell, value.departureDate === date && s.selected]}
                          onPress={() => choose(date)}
                        >
                          <Text style={[s.text, disabled && s.muted]}>{day > 0 ? day : ''}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(16,35,63,.42)', padding: 20 },
  sheet: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontFamily: typography.fontFamily.semiBold, color: '#122640', flex: 1 },
  blue: { fontFamily: typography.fontFamily.semiBold, color: '#2166F3', paddingVertical: 10 },
  text: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: '#122640' },
  input: { borderWidth: 1, borderColor: '#D6E1F3', borderRadius: 14, padding: 12 },
  option: {
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingVertical: 10,
  },
  selected: { backgroundColor: '#DBE8FF', borderRadius: 12 },
  muted: { color: '#B5C1D5' },
});
