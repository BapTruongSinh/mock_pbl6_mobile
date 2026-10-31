import React, { useEffect, useState } from 'react';
import { AppState, Linking, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DriverDetailFrame, type DriverDetailTab } from './DriverDetailFrame';
import { driverManifestAssets } from './driverManifestAssets';
import { ManifestAsset as Icon, ManifestAction as Action } from './ManifestComponents';
import { manifestStyles as m } from './driverManifest.styles';
import { useDriverCheckIn } from './useDriverCheckIn';
import type { ManifestController } from './useDriverManifest';
const TITLES: Record<string, string> = {
  success: 'Đã ghi nhận lên xe',
  already: 'Vé đã được soát',
  unknown: 'Chưa xác định kết quả',
  stale: 'Danh sách cần cập nhật',
  wrongTrip: 'Vé không thuộc chuyến',
  cancelled: 'Vé đã hủy',
  refunded: 'Vé đã hoàn tiền',
  used: 'Vé đã sử dụng',
  invalid: 'Mã vé không hợp lệ',
  forbidden: 'Không có quyền soát vé',
  offline: 'Cần kết nối để soát vé',
};
const COPY: Record<string, string> = {
  unknown: 'Kết nối bị gián đoạn sau khi gửi. Kiểm tra lại kết quả trước khi quét lần nữa.',
  stale: 'Hãy cập nhật danh sách trước khi tiếp tục soát vé.',
  wrongTrip: 'Mã vé không thuộc chuyến này. Vé được giữ nguyên trạng thái.',
  cancelled: 'Vé không còn hiệu lực để lên xe. Không thể check-in.',
  refunded: 'Vé không còn hiệu lực để lên xe. Không thể check-in.',
  used: 'Vé đã được sử dụng cho hành trình trước. Không thể check-in lại.',
  invalid: 'Không tìm thấy vé hợp lệ từ mã vừa nhập. Kiểm tra mã hoặc quét lại.',
  forbidden:
    'Bạn không còn được phân công chuyến này hoặc quyền tài xế đã hết hiệu lực. Thông tin hành khách đã được ẩn.',
  offline: 'Không thể check-in khi ngoại tuyến. Kết nối mạng rồi kiểm tra lại mã vé.',
};
export function DriverCheckInScreen({
  tripId,
  manifest,
  reviewNode,
  onBack,
  onNavigate,
}: {
  tripId: string;
  manifest: ManifestController;
  reviewNode?: string;
  onBack: () => void;
  onNavigate: (tab: DriverDetailTab) => void;
}): React.ReactElement {
  const scanner = useDriverCheckIn(tripId, manifest, reviewNode);
  const { view, node } = scanner;
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [cameraError, setCameraError] = useState(false);
  const [mock, setMock] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const ready = view === 'scan';
  const manual = view === 'manual';
  const checking = view === 'checking';
  const success = view === 'success' || view === 'already';
  const uncertain = view === 'unknown';
  const forbidden = view === 'forbidden';
  const passenger = scanner.result?.passenger;
  const trip = manifest.data?.trip;
  return (
    <DriverDetailFrame
      node={node}
      title="Soát vé"
      subtitle="Chỉ kiểm tra vé của chuyến được giao"
      assetMap={driverManifestAssets}
      onBack={onBack}
      onNavigate={onNavigate}
      onLongPress={() => {
        if (__DEV__) setMock(!mock);
      }}
    >
      <View style={m.camera}>
        {ready && permission?.granted && active && !cameraError && !reviewNode && (
          <CameraView
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(event) => {
              void scanner.submit(event.data, true);
            }}
            onMountError={() => setCameraError(true)}
            testID="driver.scan.camera"
          />
        )}
        <Text style={m.cameraTitle}>
          {tripId} | {trip?.origin ?? 'TP.HCM'} → {trip?.destination ?? 'Đà Lạt'}
        </Text>
        <View pointerEvents="none" style={m.scanFrame}>
          <Icon node={node} name="imgIconScan" size={90} />
        </View>
        <Text style={m.cameraNote}>
          {checking ? 'Đang kiểm tra mã vé…' : 'Đặt mã QR vào giữa khung hình'}
        </Text>
      </View>
      {ready && (!permission?.granted || cameraError) && !reviewNode && (
        <View style={m.result}>
          <Text style={m.copy}>
            {cameraError
              ? 'Không mở được camera. Bạn có thể nhập mã vé thủ công.'
              : 'Cho phép camera để quét mã QR trên vé.'}
          </Text>
          <Action
            label={permission?.canAskAgain === false ? 'Mở cài đặt camera' : 'Cho phép dùng camera'}
            onPress={() => {
              if (permission?.canAskAgain === false) void Linking.openSettings();
              else void requestPermission();
            }}
          />
        </View>
      )}
      {mock && (
        <View style={m.result}>
          <Text style={m.mock}>
            Mã thử mock: TVL-9K2C-7M4Q (hợp lệ), TVL-CNCL-0001 (hủy), TVL-RFND-0001 (hoàn),
            TVL-WRNG-0001 (sai chuyến), TVL-USED-0001 (đã dùng), TVL-TIME-0001 (chưa rõ kết quả).
          </Text>
          <Action
            label="Thử vé hợp lệ"
            testID="driver.scan.mock.valid"
            onPress={() => void scanner.submit('TVL-9K2C-7M4Q')}
          />
        </View>
      )}
      {manual ? (
        <View style={m.result}>
          <View style={m.row}>
            <Icon node={node} name="imgIconTicket" />
            <Text style={m.listTitle}>Nhập mã vé</Text>
          </View>
          <Text style={m.copy}>Mã vé được hiển thị trên vé của hành khách.</Text>
          <View style={m.field}>
            <Text style={m.label}>Mã vé</Text>
            <TextInput
              testID="driver.scan.code"
              accessibilityLabel="Mã vé"
              autoCapitalize="characters"
              autoCorrect={false}
              value={scanner.code}
              onChangeText={scanner.setCode}
              maxLength={64}
              style={m.input}
            />
          </View>
        </View>
      ) : checking ? (
        <View style={m.result} accessibilityRole="progressbar">
          <View style={m.row}>
            <Icon node={node} name="imgIconRefresh" />
            <Text style={m.listTitle}>Đang kiểm tra vé</Text>
          </View>
          <Text style={m.copy}>Vui lòng chờ kết quả. Không quét lại hoặc gửi thêm yêu cầu.</Text>
          <Action label="Đang xử lý" primary disabled onPress={() => undefined} />
        </View>
      ) : ready ? (
        <View style={m.result}>
          <View style={m.row}>
            <Icon node={node} name="imgIconTicket" />
            <Text style={m.listTitle}>Sẵn sàng đón khách</Text>
          </View>
          <Text style={m.copy}>
            Giữ mã QR rõ nét trong khung. Kết quả được kiểm tra trực tuyến trước khi ghi nhận lên
            xe.
          </Text>
          <View style={m.row}>
            <Icon node={node} name="imgIconUser" />
            <Text style={[m.copy, { flex: 1 }]}>Đã lên xe</Text>
            <Text style={m.passengerName}>
              {manifest.data?.passengers.filter((p) => p.checkedIn && p.status === 'valid')
                .length ?? 13}{' '}
              / {trip?.capacity ?? 34} khách
            </Text>
          </View>
        </View>
      ) : (
        <View style={m.result} testID={`driver.scan.result.${view}`}>
          <View style={m.row}>
            <Icon node={node} name={success ? 'imgIconCheck' : 'imgIconAlert'} size={20} />
            <Text style={m.listTitle}>{TITLES[view]}</Text>
          </View>
          {success ? (
            <>
              <View style={m.row}>
                <Icon node={node} name="imgIconUser" />
                <Text style={[m.copy, { flex: 1 }]}>Hành khách</Text>
                <Text style={m.passengerName}>{passenger?.name ?? 'Nguyễn A.'}</Text>
              </View>
              <View style={m.row}>
                <Icon node={node} name="imgIconTicket" />
                <Text style={[m.copy, { flex: 1 }]}>Ghế</Text>
                <Text style={m.passengerName}>{passenger?.seat ?? 'A01'}</Text>
              </View>
              <Text style={m.note}>Hoàng Nam đã ghi nhận kiểm tra vé.</Text>
              {view === 'already' && <Text style={m.copy}>Giữ nguyên lần check-in trước đó.</Text>}
            </>
          ) : (
            <>
              <Text style={m.copy}>{COPY[view]}</Text>
              <Text style={m.note}>Kết quả kiểm tra cho chuyến được phân công</Text>
            </>
          )}
        </View>
      )}
      {!checking && (
        <View style={{ gap: 6 }}>
          {manual ? (
            <>
              <Action
                label="Kiểm tra vé"
                primary
                testID="driver.scan.submit"
                disabled={!scanner.code.trim()}
                onPress={() => void scanner.submit()}
              />
              <Action label="Quay lại quét QR" onPress={scanner.reset} />
            </>
          ) : ready ? (
            <>
              <Action
                label="Nhập mã vé thủ công"
                testID="driver.scan.manual"
                onPress={scanner.manual}
              />
              <Action label="Danh sách hành khách" onPress={onBack} />
            </>
          ) : (
            <>
              <Action
                label={
                  forbidden
                    ? 'Về chuyến của tôi'
                    : uncertain
                      ? 'Kiểm tra lại kết quả'
                      : view === 'stale'
                        ? 'Cập nhật danh sách'
                        : view === 'offline'
                          ? 'Thử kết nối lại'
                          : success
                            ? 'Quét vé tiếp theo'
                            : 'Quét vé khác'
                }
                primary
                testID="driver.scan.next"
                onPress={
                  forbidden
                    ? () => onNavigate('home')
                    : uncertain
                      ? () => void scanner.query()
                      : view === 'stale'
                        ? onBack
                        : scanner.reset
                }
              />
              <Action
                label={forbidden ? 'Về chuyến của tôi' : 'Danh sách hành khách'}
                onPress={forbidden ? () => onNavigate('home') : onBack}
              />
            </>
          )}
        </View>
      )}
    </DriverDetailFrame>
  );
}
