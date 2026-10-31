import { bookingTrip } from './bookingModel';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerBottomNav, type CustomerTab } from '../../shared/components/CustomerBottomNav';
import { useSession } from '../auth/useSession';
import { getDemoTickets, type DemoIssuedBooking } from './demoTicketRepository';
import { TicketScreen } from './TicketScreen';
import { BookingBackground, BookingHeader } from './BookingShared';
import { bookingStyles as s } from './booking.styles';
import { bookingAssets as a } from './bookingAssets';
export function MyDemoTicketsScreen({
  onNavigate,
  onLogin,
  reviewTickets,
}: {
  onNavigate: (tab: CustomerTab) => void;
  onLogin: () => void;
  reviewTickets?: DemoIssuedBooking[];
}): React.ReactElement {
  const { session } = useSession();
  const tickets = reviewTickets ?? (session ? getDemoTickets(session.accountId) : []);
  const [selected, setSelected] = useState<DemoIssuedBooking | null>(null);
  const [filter, setFilter] = useState('all');
  const past = tickets.filter((t) => t.journeyStatus === 'past');
  const upcoming = tickets.filter((t) => t.journeyStatus !== 'past');
  const visible = filter === 'past' ? past : filter === 'upcoming' ? upcoming : tickets;
  return (
    <View style={s.root}>
      <BookingBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.content}>
          {selected ? (
            <>
              <BookingHeader title="Vé điện tử" blue onBack={() => setSelected(null)} />
              <TicketScreen
                key={selected.id}
                state={selected.booking}
                cancellationEligible={selected.journeyStatus !== 'past'}
                onReturnToList={() => setSelected(null)}
              />
            </>
          ) : (
            <>
              <View style={styles.header}>
                <View style={s.spread}>
                  <View style={{ width: 40 }} />
                  <Text style={styles.title}>Vé của tôi</Text>
                  <Text style={styles.white}>{tickets.length} vé</Text>
                </View>
                <View style={s.row}>
                  {[
                    ['all', 'Tất cả', tickets.length],
                    ['upcoming', 'Sắp tới', upcoming.length],
                    ['past', 'Đã đi', past.length],
                  ].map(([key, label, count]) => (
                    <Pressable
                      key={key}
                      testID={`tickets.filter.${key}`}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: filter === key }}
                      style={[styles.filter, filter === key && { backgroundColor: 'white' }]}
                      onPress={() => setFilter(String(key))}
                    >
                      <Text style={[styles.white, filter === key && { color: '#164AAB' }]}>
                        {label} {count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <ScrollView testID="screen.FIGMA-635-45" contentContainerStyle={styles.list}>
                {!session && !reviewTickets ? (
                  <Pressable accessibilityRole="button" onPress={onLogin} style={s.button}>
                    <Text style={s.buttonText}>Đăng nhập để xem vé</Text>
                  </Pressable>
                ) : visible.length ? (
                  visible.map((t) => (
                    <Pressable
                      key={t.id}
                      testID={`tickets.open.${t.id}`}
                      accessibilityRole="button"
                      style={styles.card}
                      onPress={() => setSelected(t)}
                    >
                      <View style={s.spread}>
                        <Image
                          source={a.logo}
                          style={{ width: 64, height: 20 }}
                          resizeMode="contain"
                        />
                        <View style={s.issued}>
                          <Text style={s.issuedText}>
                            {t.booking.cancelledSeats?.length === t.booking.seats.length
                              ? 'Đã hủy'
                              : t.journeyStatus === 'past'
                                ? 'Đã đi'
                                : 'Sắp đi'}
                          </Text>
                        </View>
                      </View>
                      <View style={s.row}>
                        <View style={s.flex}>
                          <Text style={s.body}>{bookingTrip(t.booking).departure}</Text>
                          <Text style={s.routeTitle}>TP.HCM</Text>
                          <Text style={s.small}>Miền Đông mới</Text>
                        </View>
                        <Image
                          source={a.route}
                          style={{ width: 102, height: 28 }}
                          resizeMode="contain"
                        />
                        <View style={s.flex}>
                          <Text style={[s.body, s.right]}>{bookingTrip(t.booking).arrival}</Text>
                          <Text style={[s.routeTitle, s.right]}>Đà Lạt</Text>
                          <Text style={[s.small, s.right]}>Trung tâm Đà Lạt</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={s.spread}>
                        <Text style={s.body}>{bookingTrip(t.booking).id}</Text>
                        <Text style={s.small}>28/08/2026</Text>
                        <Text style={styles.seats}>Ghế {t.booking.seats.join(' · ')}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.card}>
                    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: '#EDF4FF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image source={a.ticket} style={{ width: 28, height: 28 }} />
                      </View>
                      <Text style={s.title}>
                        {filter === 'past' ? 'Chưa có hành trình đã đi' : 'Chưa có vé ở đây'}
                      </Text>
                      <Text style={[s.small, { textAlign: 'center', lineHeight: 19 }]}>
                        Những chuyến đi đã hoàn thành sẽ được lưu tại đây để bạn dễ dàng xem lại.
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </>
          )}
          <View style={s.footerNav}>
            <CustomerBottomNav
              active="tickets"
              onNavigate={(tab) => {
                if (tab === 'tickets') setSelected(null);
                else onNavigate(tab);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { padding: 20, gap: 22 },
  title: { fontFamily: 'Be Vietnam Pro Bold', fontSize: 24, color: 'white' },
  white: { fontFamily: 'Be Vietnam Pro SemiBold', fontSize: 11, color: 'white' },
  filter: {
    flex: 1,
    borderRadius: 19,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
  },
  list: { paddingHorizontal: 20, gap: 14, paddingBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 18,
    gap: 14,
    minHeight: 164,
    boxShadow: '0px 7px 18px rgba(10,31,71,0.10)',
  },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#D5E2F5' },
  seats: { fontFamily: 'Be Vietnam Pro SemiBold', fontSize: 10, color: '#2C6BED', flexShrink: 1 },
});
