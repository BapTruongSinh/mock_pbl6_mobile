import React from 'react';
import { View, Text, Image } from 'react-native';
import { DriverDetailFrame, type DriverDetailTab } from './DriverDetailFrame';
import { driverActionAssets } from './driverActionAssets';
import { manifestStyles as s } from './driverManifest.styles';
import { ManifestAction } from './ManifestComponents';
export function DriverConnectionScreen({
  kind,
  onRetry,
  onBack,
  onNavigate,
}: {
  kind: 'offline' | 'expired' | 'profile';
  onRetry: () => void;
  onBack: () => void;
  onNavigate: (tab: DriverDetailTab) => void;
}): React.ReactElement {
  const profile = kind === 'profile';
  const node = profile ? '1146:1196' : '1135:322';
  const a = driverActionAssets[node];
  return (
    <DriverDetailFrame
      node={node}
      assetMap={driverActionAssets}
      title={profile ? 'Tài khoản' : 'BLUE Driver'}
      subtitle={profile ? 'Hồ sơ và phiên đăng nhập' : 'Bảo vệ phiên làm việc của bạn'}
      onBack={onBack}
      onNavigate={onNavigate}
      onLongPress={() => undefined}
      hideNavigation={!profile}
      activeTab="account"
    >
      <View
        style={[s.stateCard, { marginTop: profile ? 0 : 104 }]}
        testID={'driver.connection.' + kind}
      >
        <Image
          source={a?.[profile ? 'imgIconUser' : 'imgIconLock']}
          style={{ height: 40, width: 40, alignSelf: 'center' }}
          resizeMode="contain"
        />
        <Text style={s.headline}>
          {profile
            ? 'Chưa tải được hồ sơ'
            : kind === 'expired'
              ? 'Phiên đăng nhập đã hết hạn'
              : 'Không có kết nối'}
        </Text>
        <Text style={[s.copy, { textAlign: 'center' }]}>
          {profile
            ? 'Kiểm tra kết nối rồi thử tải lại.'
            : kind === 'expired'
              ? 'Vui lòng đăng nhập lại để tiếp tục công việc.'
              : 'Không thể tải dữ liệu mới. Kiểm tra Wi-Fi hoặc mạng di động rồi thử lại.'}
        </Text>
        <ManifestAction
          label={profile ? 'Thử lại' : kind === 'expired' ? 'Đăng nhập lại' : 'Thử kết nối lại'}
          primary
          testID="driver.connection.retry"
          onPress={onRetry}
        />
        {!profile && <Text style={s.note}>BLUE Driver</Text>}
      </View>
      {profile && (
        <>
          <View style={[s.list, { marginTop: 50 }]}>
            <Text style={s.listTitle}>Công việc của bạn</Text>
            {[
              'Xem chuyến được phân công',
              'Đón khách và kiểm tra vé',
              'Cập nhật tiến độ hành trình',
            ].map((t) => (
              <View key={t} style={s.row}>
                <Image source={a?.imgIconCheck} style={{ width: 18, height: 18 }} />
                <Text style={s.copy}>{t}</Text>
              </View>
            ))}
            <Text style={s.note}>Quyền được quản lý bởi nhà xe.</Text>
          </View>
          <ManifestAction label="Đăng xuất" onPress={onBack} />
        </>
      )}
    </DriverDetailFrame>
  );
}
