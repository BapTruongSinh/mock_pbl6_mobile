import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { DriverDetailFrame, type DriverDetailTab } from './DriverDetailFrame';
import { driverManifestAssets } from './driverManifestAssets';
import { manifestStyles as m } from './driverManifest.styles';
import { ManifestAsset as Icon, ManifestAction as Action } from './ManifestComponents';
import { useDriverManifest, type ManifestReview } from './useDriverManifest';
import { canCheckStage, filterManifest, PICKUP_STOPS } from './driverManifestRepository';
import { STAGE_LABEL, type DriverTripRepository } from './driverTripRepository';
import { DriverCheckInScreen } from './DriverCheckInScreen';
export function DriverManifestScreen({
  tripId,
  onBack,
  onNavigate,
  review,
  tripService,
}: {
  tripId: string;
  onBack: () => void;
  onNavigate: (tab: DriverDetailTab) => void;
  review?: ManifestReview;
  tripService?: DriverTripRepository;
}): React.ReactElement {
  const manifest = useDriverManifest(tripId, review, tripService);
  const { data, state } = manifest;
  const [scan, setScan] = useState(!!review?.scanNode);
  const [pickup, setPickup] = useState<string[]>(review?.pickup ? ['mien-dong'] : []);
  const [status, setStatus] = useState<'all' | 'pending' | 'boarded'>(
    review?.pending ? 'pending' : 'all',
  );
  const [sheet, setSheet] = useState<'pickup' | 'status' | null>(null);
  const { height } = useWindowDimensions();
  const listHeight = Math.min(400, Math.max(220, height * 0.38));
  const [tools, setTools] = useState(false);
  const rows = state === 'empty' ? [] : filterManifest(data?.passengers ?? [], pickup, status);
  const node =
    state === 'loading'
      ? '1137:345'
      : state === 'error' || state === 'forbidden'
        ? '1137:501'
        : state === 'stale'
          ? '1137:264'
          : rows.length === 0
            ? '1137:422'
            : status === 'pending'
              ? '1137:182'
              : pickup.length
                ? '1137:100'
                : '1137:18';
  const boarding = canCheckStage(data?.trip.stage ?? 'scheduled');
  const hidden = data?.trip.stage === 'arrived' || data?.trip.stage === 'completed';
  if (scan)
    return (
      <DriverCheckInScreen
        tripId={tripId}
        manifest={manifest}
        reviewNode={review?.scanNode}
        onBack={() => {
          setScan(false);
          void manifest.reload();
        }}
        onNavigate={onNavigate}
      />
    );
  const count = data?.passengers.filter((p) => p.status === 'valid').length ?? 34;
  const checked = data?.passengers.filter((p) => p.status === 'valid' && p.checkedIn).length ?? 13;
  return (
    <>
      <DriverDetailFrame
        node={node}
        title="Hành khách"
        subtitle={`${tripId} — 28/08/2026`}
        assetMap={driverManifestAssets}
        onBack={onBack}
        onNavigate={onNavigate}
        onLongPress={() => {
          if (__DEV__) setTools(!tools);
        }}
      >
        <View style={m.summary}>
          <View style={m.badge}>
            <Icon node={node} name="imgIconClock" size={14} />
            <Text style={m.badgeText}>
              {tripId} — {STAGE_LABEL[data?.trip.stage ?? 'boarding']}
            </Text>
          </View>
          <Text style={m.route}>
            {data?.trip.origin ?? 'TP.HCM'} → {data?.trip.destination ?? 'Đà Lạt'}
          </Text>
          <View style={m.row}>
            <Icon node={node} name="imgIconClock1" />
            <Text style={[m.copy, { flex: 1 }]}>Khởi hành</Text>
            <Text style={m.passengerName}>{data?.trip.departure ?? '11:00'} hôm nay</Text>
          </View>
          <Text style={m.count}>
            {checked} / {count} khách đã lên xe
          </Text>
          <View style={m.track}>
            <View style={[m.progress, { width: `${count ? (checked / count) * 100 : 0}%` }]} />
          </View>
        </View>
        <View style={m.filters}>
          <Pressable
            accessibilityRole="button"
            testID="driver.manifest.pickup"
            onPress={() => setSheet('pickup')}
            style={m.filter}
          >
            <Text style={m.filterText}>
              {pickup.length === 0
                ? 'Tất cả điểm đón'
                : pickup.length === 1
                  ? PICKUP_STOPS.find((s) => s.id === pickup[0])?.short
                  : `${pickup.length} điểm đón`}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="driver.manifest.status"
            onPress={() => setSheet('status')}
            style={m.filter}
          >
            <Text style={m.filterText}>
              {status === 'all'
                ? `Tất cả khách (${count})`
                : status === 'pending'
                  ? `Chưa lên xe (${count - checked})`
                  : `Đã lên xe (${checked})`}
            </Text>
          </Pressable>
        </View>
        {tools && (
          <View style={m.list}>
            <Text style={m.mock}>Dữ liệu mô phỏng — thử thay đổi vé</Text>
            <Action
              label="Giả lập khách hủy vé"
              testID="driver.manifest.mock.cancel"
              onPress={() => void manifest.simulateCancel()}
            />
          </View>
        )}
        {state === 'stale' && (
          <View style={m.list}>
            <View style={m.row}>
              <Icon node={node} name="imgIconRefresh" />
              <Text style={m.listTitle}>Danh sách cần cập nhật</Text>
            </View>
            <Text style={m.copy}>Bản lưu đã thay đổi. Hãy tải dữ liệu mới trước khi soát vé.</Text>
            <Action
              label="Cập nhật danh sách"
              primary
              testID="driver.manifest.refresh"
              onPress={() => void manifest.reload()}
            />
          </View>
        )}
        {state === 'loading' ? (
          <View style={m.list} accessibilityRole="progressbar">
            <View style={m.row}>
              <Icon node={node} name="imgIconRefresh" />
              <Text style={m.listTitle}>Đang tải danh sách</Text>
            </View>
            {[84, 100, 71, 100].map((w, i) => (
              <View
                key={i}
                style={{
                  width: `${w}%`,
                  height: 18,
                  borderRadius: 6,
                  backgroundColor: '#F1F6FD',
                  marginTop: 6,
                }}
              />
            ))}
          </View>
        ) : state === 'error' || state === 'forbidden' || !rows.length ? (
          <View style={m.stateCard}>
            <View style={{ alignItems: 'center' }}>
              <Icon node={node} name="imgIconUser" size={40} />
            </View>
            <Text style={m.headline}>
              {state === 'forbidden'
                ? 'Không có quyền xem hành khách'
                : state === 'error'
                  ? 'Chưa tải được danh sách'
                  : 'Chưa có hành khách'}
            </Text>
            <Text style={[m.copy, { textAlign: 'center' }]}>
              {state === 'forbidden'
                ? 'Phân công hoặc quyền tài xế không còn hiệu lực.'
                : state === 'error'
                  ? 'Kiểm tra kết nối và tải lại danh sách trước khi đón khách.'
                  : 'Không có hành khách phù hợp với bộ lọc hiện tại.'}
            </Text>
            <Action
              label={
                state === 'forbidden'
                  ? 'Về chuyến của tôi'
                  : state === 'error'
                    ? 'Thử lại'
                    : 'Bỏ bộ lọc'
              }
              primary
              testID="driver.manifest.retry"
              onPress={
                state === 'forbidden'
                  ? onBack
                  : state === 'error'
                    ? () => void manifest.reload()
                    : () => {
                        setPickup([]);
                        setStatus('all');
                        void manifest.reload();
                      }
              }
            />
          </View>
        ) : (
          <View style={m.list}>
            <View style={m.row}>
              <Icon node={node} name="imgIconUser" />
              <Text style={m.listTitle}>
                {status === 'pending' ? 'Khách chưa lên xe' : 'Danh sách hành khách'}
              </Text>
            </View>
            <ScrollView
              key={`${pickup.join(',')}:${status}`}
              testID="driver.manifest.passengerList"
              accessibilityLabel="Danh sách hành khách, cuộn để xem thêm"
              style={{ height: listHeight }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {rows.map((row) => (
                <View key={row.id} testID={`driver.passenger.${row.seat}`} style={m.passenger}>
                  <View style={m.seat}>
                    <Text style={m.seatText}>{row.seat}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={m.passengerName}>
                      {row.name} — {row.checkedIn ? 'Đã lên' : 'Chưa lên'}
                    </Text>
                    <Text style={m.ticketCode}>TVL-••••-{row.code.slice(-4)}</Text>
                    {!review && <Text style={m.note}>{row.pickupName}</Text>}
                  </View>
                  <Icon
                    node={node}
                    name={row.checkedIn ? 'imgIconCheck' : 'imgIconClock2'}
                    size={20}
                  />
                </View>
              ))}
            </ScrollView>
            <Text style={m.note}>
              {pickup.length
                ? 'Theo điểm đón ' +
                  PICKUP_STOPS.filter((s) => pickup.includes(s.id))
                    .map((s) => s.name)
                    .join(', ')
                : 'Theo từng điểm đón đã đặt trên vé'}
            </Text>
          </View>
        )}
        <View style={{ gap: 8 }}>
          {!hidden && state !== 'loading' && state !== 'error' && state !== 'forbidden' && (
            <Action
              label="Quét hoặc nhập mã vé"
              primary
              testID="driver.manifest.scan"
              disabled={!boarding || state === 'stale'}
              onPress={() => setScan(true)}
            />
          )}
          <Text style={m.note}>Cập nhật lúc 10:36 ngày 28/08/2026 (UTC+7)</Text>
        </View>
      </DriverDetailFrame>
      <Modal
        visible={sheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <View style={m.scrim}>
          <View style={m.modal}>
            <Text style={m.listTitle}>
              {sheet === 'pickup' ? 'Lọc điểm đón' : 'Trạng thái lên xe'}
            </Text>
            <ScrollView>
              {sheet === 'pickup' ? (
                <>
                  <Pressable
                    testID="driver.pickup.all"
                    accessibilityRole="button"
                    onPress={() => {
                      setPickup([]);
                    }}
                    style={[m.option, !pickup.length && m.optionSelected]}
                  >
                    <Text style={m.copy}>Tất cả điểm đón</Text>
                  </Pressable>
                  {PICKUP_STOPS.map((stop) => (
                    <Pressable
                      key={stop.id}
                      testID={`driver.pickup.${stop.id}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: pickup.includes(stop.id) }}
                      onPress={() => {
                        setPickup((old) =>
                          old.includes(stop.id)
                            ? old.filter((id) => id !== stop.id)
                            : [...old, stop.id],
                        );
                      }}
                      style={[m.option, pickup.includes(stop.id) && m.optionSelected]}
                    >
                      <Text style={m.copy}>{stop.name}</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                (['all', 'pending', 'boarded'] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: status === value }}
                    testID={`driver.status.${value}`}
                    onPress={() => {
                      setStatus(value);
                      setSheet(null);
                    }}
                    style={[m.option, status === value && m.optionSelected]}
                  >
                    <Text style={m.copy}>
                      {value === 'all'
                        ? 'Tất cả khách'
                        : value === 'pending'
                          ? 'Chưa lên xe'
                          : 'Đã lên xe'}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Action label="Áp dụng" primary onPress={() => setSheet(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
