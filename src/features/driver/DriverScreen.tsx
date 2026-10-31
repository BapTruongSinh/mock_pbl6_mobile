import { DriverAccountScreen } from './DriverAccountScreen';
import { DriverTripDetailScreen } from './DriverTripDetailScreen';
import type { DetailReview } from './useDriverTripDetail';
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { driverAssets } from './driverAssets';
import { driverStyles as s } from './driver.styles';
import { useDriverSchedule, type DriverReview } from './useDriverSchedule';
import type { DriverTrip, DriverScheduleTab } from './driverScheduleRepository';
import { AppNotice, type AppNoticeValue } from '../../shared/components/AppNotice';
const successIcon =
  require('../../shared/assets/booking/31-183-icon-payment-success.png') as number;
type DriverSection = 'home' | 'route' | 'scan' | 'account';
function Asset({
  node,
  name,
  width,
  height = width,
}: {
  node: string;
  name: string;
  width: number;
  height?: number;
}): React.ReactElement {
  return (
    <Image source={driverAssets[node]?.[name]} style={{ width, height }} resizeMode="contain" />
  );
}
function Action({
  label,
  onPress,
  primary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  testID?: string;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={[s.button, primary && s.primary]}
    >
      <Text style={[s.buttonText, primary && s.white]}>{label}</Text>
    </Pressable>
  );
}
function TripCard({
  trip,
  node,
  onOpen,
  hideAction = false,
  showBoarded = false,
}: {
  trip: DriverTrip;
  node: string;
  onOpen: () => void;
  hideAction?: boolean;
  showBoarded?: boolean;
}): React.ReactElement {
  return (
    <View style={s.card} testID={`driver.trip.${trip.id}`}>
      <View style={s.row}>
        <Text style={s.code}>{trip.id}</Text>
        <Text style={s.status}>{trip.status}</Text>
      </View>
      <View style={s.divider} />
      <View style={s.journey}>
        <View style={s.endpoint}>
          <Text style={s.time}>{trip.departure}</Text>
          <Text style={s.city}>{trip.origin}</Text>
        </View>
        <Asset node={node} name="imgJourneyCustomerBusConnector" width={108} height={17} />
        <View style={s.endpoint}>
          <Text style={[s.time, s.right]}>{trip.arrival}</Text>
          <Text style={[s.city, s.right]}>{trip.destination}</Text>
        </View>
      </View>
      <View style={s.row}>
        <Asset node={node} name="imgIconPin" width={18} />
        <Text style={s.detailLabel}>Điểm xuất phát</Text>
        <Text style={s.detailValue}>{trip.pickup}</Text>
      </View>
      <View style={s.row}>
        <Asset node={node} name="imgIconBus" width={18} />
        <Text style={s.detailLabel}>Xe được giao</Text>
        <Text style={s.detailValue}>{trip.plate}</Text>
      </View>
      {showBoarded && (
        <View style={s.row}>
          <Asset node={node} name="imgIconUser" width={18} />
          <Text style={s.detailLabel}>Khách đã lên xe</Text>
          <Text style={s.detailValue}>{trip.boarded ?? '13 / 34 khách'}</Text>
        </View>
      )}
      {!hideAction && (
        <Action label="Xem thông tin chuyến" testID={`driver.open.${trip.id}`} onPress={onOpen} />
      )}
    </View>
  );
}
export function DriverScreen({
  review,
  onLogout,
}: {
  review?: DriverReview;
  onLogout: () => void;
}): React.ReactElement {
  const schedule = useDriverSchedule(review);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<DriverSection>(review && !review.home ? 'route' : 'home');
  const [showMock, setShowMock] = useState(false);
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const detailReview = useMemo<DetailReview | undefined>(
    () =>
      review
        ? { stage: schedule.selected?.status === 'Đã hoàn thành' ? 'completed' : 'scheduled' }
        : undefined,
    [review, schedule.selected?.status],
  );
  const [notice, setNotice] = useState<AppNoticeValue | null>(null);
  const isRoute = section === 'route';
  const state = schedule.state;
  const tab = schedule.tab;
  const node =
    state === 'loading'
      ? '1136:178'
      : state === 'empty'
        ? '1136:247'
        : state === 'error'
          ? '1136:318'
          : state === 'revoked'
            ? '1136:389'
            : !isRoute
              ? '35:2'
              : tab === 'upcoming'
                ? '1136:18'
                : tab === 'completed'
                  ? '1136:98'
                  : '1160:18';
  const isMessage = ['empty', 'error', 'revoked'].includes(state);
  const isAccount = section === 'account';
  const isHome = section === 'home' && !schedule.selected;
  const bodyHeight = Math.max(510, height - insets.top - insets.bottom - 200);
  const goHome = (): void => {
    setSection('home');
    schedule.clearSelection();
    schedule.changeTab('today');
    schedule.simulate('ready');
    void schedule.refresh();
  };
  const selectTab = (next: DriverScheduleTab): void => {
    schedule.changeTab(next);
  };
  const openTrip = (trip: DriverTrip): void => {
    schedule.select(trip);
    setDetailTripId(trip.id);
  };
  if (isAccount && !detailTripId)
    return (
      <DriverAccountScreen
        onLogout={onLogout}
        onNavigate={(tab) => {
          if (tab === 'home') goHome();
          else setSection(tab);
        }}
      />
    );
  if (detailTripId)
    return (
      <DriverTripDetailScreen
        tripId={detailTripId}
        review={detailReview}
        onClose={(completed) => {
          if (!schedule.session || schedule.session.role !== 'driver') {
            onLogout();
            return;
          }
          setDetailTripId(null);
          schedule.clearSelection();
          if (completed) {
            setSection('route');
            schedule.changeTab('completed');
          }
          void schedule.refresh();
        }}
        onNavigate={(tab) => {
          if (!schedule.session || schedule.session.role !== 'driver') {
            onLogout();
            return;
          }
          if (tab === 'scan') {
            setNotice({
              title: 'Soát vé',
              message: 'Chức năng soát vé sẽ được bổ sung ở bước tiếp theo.',
              variant: 'error',
            });
            return;
          }
          setDetailTripId(null);
          schedule.clearSelection();
          setSection(tab);
          if (tab === 'home') schedule.changeTab('today');
          void schedule.refresh();
        }}
      />
    );
  return (
    <View style={s.root} testID={`screen.driver.${node.replace(':', '-')}`}>
      <StatusBar barStyle="light-content" />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="driverSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4063E0" />
              <Stop offset="0.23" stopColor="#809CFA" />
              <Stop offset="0.47" stopColor="#E8F0FF" />
              <Stop offset="0.68" stopColor="#FBFCFF" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#driverSky)" />
        </Svg>
        <View
          style={{ position: 'absolute', top: 0, left: width / 2 - 195, width: 390, height: 844 }}
        >
          {[
            ['imgBackgroundBlueGlow', 28, -134, 344, 304],
            ['imgBackgroundWhiteGlow1', -143, 48, 321, 286],
            ['imgBackgroundWhiteGlow2', 206, 106, 314, 284],
            ['imgBackgroundWhiteGlow3', -2, 487, 401, 306],
          ].map(([name, left, top, w, h]) => (
            <Image
              key={name}
              source={driverAssets[node]?.[String(name)]}
              resizeMode="contain"
              style={{
                position: 'absolute',
                left: Number(left),
                top: Number(top),
                width: Number(w),
                height: Number(h),
              }}
            />
          ))}
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={state === 'loading' && !review}
              onRefresh={() => void schedule.refresh()}
              tintColor="#FFFFFF"
            />
          }
        >
          <View style={s.content}>
            <View style={s.header}>
              {isHome ? (
                <View style={s.headerSlot} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  testID="driver.back"
                  onPress={goHome}
                  style={s.back}
                >
                  <Asset node={node} name="imgIconBack" width={20} />
                </Pressable>
              )}
              <Pressable
                style={{ flex: 1 }}
                testID="driver.title"
                onLongPress={() => {
                  if (__DEV__) setShowMock(!showMock);
                }}
                accessibilityRole="header"
              >
                <Text style={s.headerTitle}>
                  {isAccount
                    ? 'Tài khoản'
                    : schedule.selected
                      ? 'Thông tin chuyến'
                      : isRoute
                        ? 'Lộ trình'
                        : 'Chuyến của tôi'}
                </Text>
              </Pressable>
              <View style={s.headerSlot}>
                <Asset node={node} name="imgIconShield" width={24} />
              </View>
            </View>
            {!isHome && (
              <Text style={s.date}>
                {isMessage || state === 'loading' ? 'Chuyến được phân công' : 'Thứ Sáu, 28/08/2026'}
              </Text>
            )}
            {showMock && (
              <View style={s.mockPanel}>
                <Text style={s.mockText}>Kiểm thử mock — không phải dữ liệu điều hành</Text>
                {(['ready', 'loading', 'empty', 'error', 'revoked'] as const).map((value) => (
                  <Action
                    key={value}
                    testID={`driver.mock.${value}`}
                    label={value}
                    onPress={() => schedule.simulate(value)}
                  />
                ))}
                {schedule.selected && (
                  <Action
                    label="Thu hồi khi tải lại"
                    testID="driver.mock.revoke"
                    onPress={() => {
                      schedule.revokeSelected();
                      void schedule.refresh();
                    }}
                  />
                )}
              </View>
            )}
            <View style={[s.body, { minHeight: bodyHeight }]}>
              {state === 'loading' ? (
                <>
                  {['Đang tải lịch chuyến', 'Đang cập nhật dữ liệu'].map((title) => (
                    <View key={title} style={s.loadingCard} accessibilityRole="progressbar">
                      <View style={s.row}>
                        <Asset node={node} name="imgIconRefresh" width={18} />
                        <Text style={s.loadingTitle}>{title}</Text>
                      </View>
                      {[0.84, 1, 0.71, 1].map((ratio, i) => (
                        <View key={i} style={[s.skeleton, { width: `${ratio * 100}%` }]} />
                      ))}
                    </View>
                  ))}
                </>
              ) : isMessage ? (
                <>
                  <View style={s.stateCenter}>
                    <View style={{ alignItems: 'center' }}>
                      <Asset
                        node={node}
                        name={
                          state === 'empty'
                            ? 'imgIconRoute'
                            : state === 'error'
                              ? 'imgIconRefresh'
                              : 'imgIconShield1'
                        }
                        width={40}
                      />
                    </View>
                    <Text style={s.stateTitle}>
                      {state === 'empty'
                        ? 'Chưa có chuyến hôm nay'
                        : state === 'error'
                          ? 'Không tải được lịch'
                          : 'Bạn không được giao chuyến này'}
                    </Text>
                    <Text style={s.stateCopy}>
                      {state === 'empty'
                        ? 'Lịch được phân công sẽ xuất hiện tại đây.'
                        : state === 'error'
                          ? 'Kết nối bị gián đoạn. Bạn có thể thử tải lại.'
                          : 'Phân công đã bị thu hồi hoặc chuyến không thuộc nhiệm vụ của bạn. Thông tin hành khách đã được ẩn.'}
                    </Text>
                    {state !== 'revoked' && (
                      <Text style={s.stateNote}>Dữ liệu chuyến được cập nhật từ điều hành.</Text>
                    )}
                  </View>
                  <Action
                    label={state === 'revoked' ? 'Về chuyến của tôi' : 'Tải lại'}
                    primary
                    testID="driver.retry"
                    onPress={
                      state === 'revoked'
                        ? goHome
                        : () => {
                            schedule.simulate('ready');
                            void schedule.refresh();
                          }
                    }
                  />
                </>
              ) : schedule.selected ? (
                <>
                  <TripCard
                    trip={schedule.selected}
                    node={node}
                    onOpen={() => undefined}
                    hideAction
                  />
                  <View style={s.footer}>
                    <Text style={s.stateNote}>Chuyến được phân công · 28/08/2026</Text>
                    <Action
                      label="Tải lại thông tin chuyến"
                      testID="driver.refreshSelected"
                      primary
                      onPress={() => void schedule.refresh()}
                    />
                    <Action label="Về chuyến của tôi" onPress={goHome} />
                  </View>
                </>
              ) : (
                <>
                  {isRoute ? (
                    <View style={s.tabs}>
                      {(
                        [
                          ['today', 'Hôm nay'],
                          ['upcoming', 'Sắp tới'],
                          ['completed', 'Đã chạy'],
                        ] as const
                      ).map(([value, label]) => (
                        <Pressable
                          accessibilityRole="tab"
                          accessibilityState={{ selected: tab === value }}
                          testID={`driver.filter.${value}`}
                          key={value}
                          onPress={() => selectTab(value)}
                          style={[s.tab, tab === value && s.tabActive]}
                        >
                          <Text style={[s.tabText, tab === value && s.white]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={s.greeting} testID="driver.home.greeting">
                      <View style={s.avatar}>
                        <Text style={s.initials}>HN</Text>
                      </View>
                      <View style={s.greetingCopy}>
                        <Text style={s.greetingTitle}>Chào anh Nam</Text>
                        <Text style={s.intro}>
                          Hôm nay anh có {schedule.trips.length} chuyến được giao
                        </Text>
                        <Text style={s.homeDate} testID="driver.home.date">
                          Thứ Sáu, 28/08/2026
                        </Text>
                      </View>
                    </View>
                  )}
                  {schedule.trips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      node={node}
                      onOpen={() => openTrip(trip)}
                      hideAction={tab === 'completed' && isRoute}
                      showBoarded={tab === 'upcoming' && isRoute}
                    />
                  ))}
                  {isRoute && tab === 'upcoming' ? (
                    <View style={s.info}>
                      <View style={s.row}>
                        <Asset node={node} name="imgIconRoute" width={18} />
                        <Text style={s.infoTitle}>Chuyến tiếp theo của bạn</Text>
                      </View>
                      <View style={s.row}>
                        <Asset node={node} name="imgIconClock" width={18} />
                        <Text style={s.detailLabel}>Ngày khởi hành</Text>
                        <Text style={s.detailValue}>28/08/2026</Text>
                      </View>
                      <Text style={s.intro}>
                        Xem lại thông tin chuyến và điểm đón trước giờ khởi hành.
                      </Text>
                      <Action label="Xem các chuyến hôm nay" onPress={() => selectTab('today')} />
                    </View>
                  ) : (
                    <View style={s.footer}>
                      {isRoute && tab === 'completed' && schedule.trips[0] && (
                        <Action
                          label="Xem thông tin chuyến"
                          onPress={() => {
                            const first = schedule.trips[0];
                            if (first) openTrip(first);
                          }}
                        />
                      )}
                      <Text style={s.updated}>Cập nhật lúc 10:36 ngày 28/08/2026 (UTC+7)</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
        <View style={s.navWrap}>
          <View style={s.nav}>
            {(
              [
                ['home', 'Hôm nay', 'imgIconHome'],
                [
                  'route',
                  'Lộ trình',
                  node === '1136:247' || node === '1136:18' ? 'imgIconRoute1' : 'imgIconRoute',
                ],
                ['account', 'Tài khoản', node === '1136:18' ? 'imgIconUser1' : 'imgIconUser'],
              ] as const
            ).map(([value, label, icon]) => {
              const active = isAccount
                ? value === 'account'
                : isRoute
                  ? value === 'route'
                  : value === 'home';
              return (
                <Pressable
                  key={value}
                  testID={`driver.tab.${value}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  style={s.navItem}
                  onPress={() => {
                    setSection(value);
                    schedule.clearSelection();
                    if (value === 'home') schedule.changeTab('today');
                  }}
                >
                  <View style={[s.navIcon, active && s.navActive]}>
                    <Asset node={node} name={icon} width={20} />
                  </View>
                  <Text style={[s.navText, active && s.navTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
      <AppNotice notice={notice} onClose={() => setNotice(null)} successIcon={successIcon} />
    </View>
  );
}
