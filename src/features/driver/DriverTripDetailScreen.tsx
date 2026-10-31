import { DriverConnectionScreen } from './DriverConnectionScreen';
import { DriverTripActionSheet, type ActionSheetMode } from './DriverTripActionSheet';
import { useSession } from '../auth/useSession';
import { DriverManifestScreen } from './DriverManifestScreen';
/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState, useRef, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DriverDetailFrame, DetailAsset, type DriverDetailTab } from './DriverDetailFrame';
import { driverStyles as s } from './driver.styles';
import { useDriverTripDetail, arrivalUnlockAt, type DetailReview } from './useDriverTripDetail';
import { STAGE_LABEL, type TripStage } from './driverTripRepository';
import { AppNotice, type AppNoticeValue } from '../../shared/components/AppNotice';
import { typography } from '../../shared/theme/tokens';
const successIcon =
  require('../../shared/assets/booking/31-183-icon-payment-success.png') as number;
const NODE: Record<TripStage, string> = {
  scheduled: '1139:18',
  boarding: '35:28',
  travelling: '1139:184',
  arrived: '1139:267',
  completed: '1139:350',
};
const LABEL: Record<TripStage, string> = {
  scheduled: 'Bắt đầu đón khách',
  boarding: 'Xác nhận xuất bến',
  travelling: 'Xác nhận đến nơi',
  arrived: 'Hoàn thành chuyến',
  completed: 'Về danh sách chuyến',
};
function Action({
  label,
  onPress,
  disabled = false,
  testID,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  primary?: boolean;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, primary && s.primary, disabled && d.disabled]}
    >
      <Text style={[s.buttonText, primary && s.white]}>{label}</Text>
    </Pressable>
  );
}
export function DriverTripDetailScreen({
  tripId,
  onClose,
  onNavigate,
  review,
}: {
  tripId: string;
  onClose: (completed: boolean) => void;
  onNavigate: (tab: DriverDetailTab) => void;
  review?: DetailReview;
}): React.ReactElement {
  const detail = useDriverTripDetail(tripId, review);
  const { trip, state } = detail;
  const auth = useSession();
  const reviewAction = review?.actionNode;
  const initialMode: ActionSheetMode | null = reviewAction
    ? ['1140:18', '1140:92', '1140:240', '1140:314'].includes(reviewAction)
      ? 'confirm'
      : ['1140:1041', '1140:1113', '1140:1257'].includes(reviewAction)
        ? 'pending'
        : reviewAction === '1140:1401'
          ? 'invalid'
          : reviewAction === '1140:1474'
            ? 'conflict'
            : reviewAction === '1135:322'
              ? 'offline'
              : reviewAction === '1146:1196'
                ? 'expired'
                : 'uncertain'
    : null;
  const [sheet, setSheet] = useState<ActionSheetMode | null>(initialMode);
  useEffect(() => {
    if (!auth.session || auth.session.role !== 'driver' || auth.session.expiresAt <= Date.now())
      setSheet('expired');
    else if (detail.state === 'unavailable' && sheet && sheet !== 'pending') setSheet('forbidden');
  }, [auth.session, detail.state, detail.now, sheet]);
  const intent = useRef<{ stage: TripStage; version: number } | null>(null);
  const sending = useRef(false);
  const confirmAction = async (): Promise<void> => {
    if (sending.current || !trip) return;
    sending.current = true;
    setSheet('pending');
    const snapshot = intent.current ?? { stage: trip.stage, version: trip.version };
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await detail.advance(snapshot);
    setSheet(result === 'success' ? null : result);
    sending.current = false;
  };
  const [mockVisible, setMockVisible] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [notice, setNotice] = useState<AppNoticeValue | null>(null);
  const node =
    state === 'loading'
      ? '1146:888'
      : state === 'error'
        ? '1146:964'
        : state === 'unavailable'
          ? '1146:1042'
          : NODE[trip?.stage ?? 'scheduled'];
  const clockLabel = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(detail.now);
  const infoRow = (icon: string, label: string, value: string): React.ReactElement => (
    <View style={s.row}>
      <DetailAsset node={node} name={icon} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
  if (sheet === 'offline' || sheet === 'expired')
    return (
      <DriverConnectionScreen
        kind={sheet}
        onBack={() => onClose(false)}
        onNavigate={onNavigate}
        onRetry={
          sheet === 'expired'
            ? () => void auth.logout().then(() => onClose(false))
            : () => {
                setSheet(null);
                void detail.reload();
              }
        }
      />
    );
  if (manifestOpen)
    return (
      <DriverManifestScreen
        tripId={tripId}
        tripService={detail.repository}
        onBack={() => {
          setManifestOpen(false);
          void detail.reload();
        }}
        onNavigate={onNavigate}
      />
    );
  return (
    <>
      <DriverDetailFrame
        node={node}
        subtitle={
          trip ? `${trip.id} — ${trip.origin} → ${trip.destination}` : 'Chuyến được phân công'
        }
        onBack={() => onClose(trip?.stage === 'completed')}
        onNavigate={(tab) => {
          if (tab === 'scan') {
            setNotice({
              title: 'Soát vé',
              message: 'Chức năng soát vé sẽ được bổ sung ở bước tiếp theo.',
              variant: 'error',
            });
            return;
          }
          onNavigate(tab);
        }}
        onLongPress={() => {
          if (__DEV__) setMockVisible(!mockVisible);
        }}
      >
        {mockVisible && (
          <View style={s.mockPanel}>
            <Text style={s.mockText}>Đồng hồ mô phỏng (chỉ review): {clockLabel}</Text>
            {trip && (
              <>
                <Action
                  label="Trước giờ xuất bến"
                  testID="driver.detail.clock.before"
                  onPress={() => detail.setClock(trip.departureAt - 60000)}
                />
                <Action
                  label="Đúng giờ xuất bến"
                  testID="driver.detail.clock.departure"
                  onPress={() => detail.setClock(trip.departureAt)}
                />
                <Action
                  label="Đủ thời gian đến nơi"
                  testID="driver.detail.clock.arrival"
                  onPress={() => detail.setClock(arrivalUnlockAt(trip))}
                />
              </>
            )}
            <Action
              label="Mô phỏng lỗi tải"
              testID="driver.detail.mock.error"
              onPress={() => detail.simulate('error')}
            />
            <Action
              label="Mô phỏng mất phân công"
              testID="driver.detail.mock.revoke"
              onPress={detail.revoke}
            />
            <Action
              label="Ẩn công cụ review"
              testID="driver.detail.mock.close"
              onPress={() => setMockVisible(false)}
            />
          </View>
        )}
        {state === 'loading' ? (
          <>
            {['Đang tải chuyến', 'Đang cập nhật dữ liệu'].map((title) => (
              <View key={title} style={s.loadingCard} accessibilityRole="progressbar">
                <View style={s.row}>
                  <DetailAsset node={node} name="imgIconRefresh" />
                  <Text style={s.loadingTitle}>{title}</Text>
                </View>
                {[0.84, 1, 0.71, 1].map((ratio, i) => (
                  <View key={i} style={[s.skeleton, { width: `${ratio * 100}%` }]} />
                ))}
              </View>
            ))}
          </>
        ) : state === 'error' || state === 'unavailable' ? (
          <>
            <View style={s.stateCenter}>
              <View style={{ alignItems: 'center' }}>
                <DetailAsset
                  node={node}
                  name={state === 'error' ? 'imgIconRefresh' : 'imgIconShield1'}
                  size={40}
                />
              </View>
              <Text style={s.stateTitle}>
                {state === 'error' ? 'Không tải được chuyến' : 'Chuyến không còn khả dụng'}
              </Text>
              <Text style={s.stateCopy}>
                {state === 'error'
                  ? 'Kiểm tra kết nối và thử tải lại thông tin chuyến.'
                  : 'Không thể mở chuyến này. Quay về lịch được phân công để cập nhật.'}
              </Text>
              {state === 'error' && (
                <Text style={s.stateNote}>Dữ liệu chuyến được cập nhật từ điều hành.</Text>
              )}
            </View>
            <Action
              label="Tải lại"
              primary
              testID="driver.detail.retry"
              onPress={() => void detail.reload()}
            />
          </>
        ) : (
          trip && (
            <>
              <View style={{ gap: 12 }}>
                <View style={[s.card, d.boardingPass]} testID="driver.detail.data">
                  <View style={d.badge}>
                    <DetailAsset node={node} name="imgIconClock" size={14} />
                    <Text style={d.badgeText}>
                      {trip.id} — {STAGE_LABEL[trip.stage]}
                    </Text>
                  </View>
                  <View style={s.journey}>
                    <View style={s.endpoint}>
                      <Text style={d.time}>{trip.departure}</Text>
                      <Text style={d.city}>{trip.origin}</Text>
                    </View>
                    <DetailAsset
                      node={node}
                      name="imgJourneyCustomerBusConnector"
                      size={108}
                      height={17}
                    />
                    <View style={s.endpoint}>
                      <Text style={[d.time, s.right]}>{trip.arrival}</Text>
                      <Text style={[d.city, s.right]}>{trip.destination}</Text>
                    </View>
                  </View>
                  <View style={s.divider} />
                  {infoRow('imgIconClock1', 'Ngày khởi hành', '28/08/2026')}
                  {infoRow('imgIconBus', 'Phương tiện', trip.plate)}
                  {infoRow('imgIconUser', 'Đã lên xe', `${trip.boarded} / ${trip.capacity} khách`)}
                  <Action
                    label="Danh sách hành khách"
                    testID="driver.detail.passengers"
                    onPress={() => setManifestOpen(true)}
                  />
                </View>
                <View style={[s.card, d.stops]}>
                  <View style={s.row}>
                    <DetailAsset node={node} name="imgIconPin" size={18} />
                    <Text style={d.sectionTitle}>Điểm đón và trả khách</Text>
                  </View>
                  <Text style={d.stopTitle}>
                    {trip.departure}
                    {'   '}
                    {trip.pickup}
                  </Text>
                  <Text style={d.address}>{trip.pickupAddress}</Text>
                  <View style={s.divider} />
                  <Text style={d.stopTitle}>
                    {trip.arrival}
                    {'   '}
                    {trip.dropoff}
                  </Text>
                  <Text style={d.address}>{trip.dropoffAddress}</Text>
                </View>
              </View>
              <View style={s.footer}>
                {!detail.enabled && trip.stage !== 'completed' && (
                  <Text style={d.lockHint} accessibilityRole="text">
                    {trip.stage === 'boarding'
                      ? `Chỉ xuất bến từ ${trip.departure} ngày 28/08/2026`
                      : `Chỉ xác nhận đến nơi từ ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(arrivalUnlockAt(trip))}`}
                  </Text>
                )}
                <Action
                  label={detail.busy ? 'Đang cập nhật…' : LABEL[trip.stage]}
                  primary
                  testID="driver.detail.action"
                  disabled={trip.stage !== 'completed' && !detail.enabled}
                  onPress={
                    trip.stage === 'completed'
                      ? () => onClose(true)
                      : () => {
                          intent.current = { stage: trip.stage, version: trip.version };
                          setSheet('confirm');
                        }
                  }
                />
                {__DEV__ && (trip.stage === 'boarding' || trip.stage === 'travelling') && (
                  <Action
                    label={
                      trip.stage === 'boarding'
                        ? 'Giả lập đủ giờ xuất bến'
                        : 'Giả lập đủ giờ đến nơi'
                    }
                    testID="driver.detail.simulateTime"
                    disabled={detail.busy}
                    onPress={() =>
                      detail.setClock(
                        trip.stage === 'boarding' ? trip.departureAt : arrivalUnlockAt(trip),
                      )
                    }
                  />
                )}
                <Text style={s.updated}>Cập nhật lúc 10:36 ngày 28/08/2026 (UTC+7)</Text>
              </View>
            </>
          )
        )}
      </DriverDetailFrame>
      <DriverTripActionSheet
        mode={sheet}
        stage={intent.current?.stage ?? trip?.stage ?? review?.stage ?? 'scheduled'}
        node={reviewAction}
        driverName="Hoàng Nam"
        enabled={detail.enabled}
        onConfirm={() => void confirmAction()}
        onClose={() => {
          if (!sending.current) setSheet(null);
        }}
        onReload={() => {
          setSheet(null);
          detail.clearError();
          void detail.reload();
        }}
        onHome={() => onClose(false)}
        onLogin={() => void auth.logout().then(() => onClose(false))}
      />
      <AppNotice
        notice={sheet ? null : notice}
        onClose={() => {
          detail.clearError();
          setNotice(null);
        }}
        successIcon={successIcon}
      />
    </>
  );
}
const d = StyleSheet.create({
  boardingPass: { paddingVertical: 28, gap: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F6FD',
    padding: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 10,
    lineHeight: 15,
    color: '#2166F3',
    flexShrink: 1,
  },
  time: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 36,
    color: '#122640',
  },
  city: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: '#122640',
  },
  stops: { paddingVertical: 29, gap: 12 },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: '#122640',
    flex: 1,
  },
  stopTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: '#122640',
  },
  address: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    color: '#7487A3',
  },
  disabled: { backgroundColor: '#B6C1D3' },
  lockHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    color: '#7487A3',
  },
});
