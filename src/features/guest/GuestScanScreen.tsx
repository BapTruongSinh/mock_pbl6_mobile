/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import {
  Alert,
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, LinearGradient, Rect, Stop, SvgUri } from 'react-native-svg';
import { scanStyles as styles } from './guestScan.styles';
import { useGuestQrScanner } from './useGuestQrScanner';
const assets = {
  back: require('../../shared/assets/guest-scan/back.svg') as number,
  shield: require('../../shared/assets/guest-scan/shield.svg') as number,
  scan: require('../../shared/assets/guest-scan/scan.svg') as number,
  ticket: require('../../shared/assets/guest-scan/ticket.svg') as number,
  blue: require('../../shared/assets/guest-scan/blue-glow.svg') as number,
  white1: require('../../shared/assets/guest-scan/white-glow-1.svg') as number,
  white2: require('../../shared/assets/guest-scan/white-glow-2.svg') as number,
  white3: require('../../shared/assets/guest-scan/white-glow-3.svg') as number,
};
function Icon({
  source,
  width,
  height = width,
}: {
  source: number;
  width: number;
  height?: number;
}): React.ReactElement {
  return <SvgUri uri={Image.resolveAssetSource(source).uri} width={width} height={height} />;
}
export function GuestScanScreen({
  onBack,
  isActive = true,
}: {
  onBack?: () => void;
  isActive?: boolean;
}): React.ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const scanner = useGuestQrScanner();
  const [cameraError, setCameraError] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);
  const { width } = useWindowDimensions();
  const cameraOn = Boolean(
    permission?.granted && isActive && appActive && !scanner.ticketCode && !cameraError,
  );
  return (
    <View style={styles.root} testID="screen.NEW-GUEST-SCAN">
      <View style={styles.background} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="guestScanGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4063E0" />
              <Stop offset="0.23" stopColor="#809CFA" />
              <Stop offset="0.47" stopColor="#E8F0FF" />
              <Stop offset="0.68" stopColor="#FBFCFF" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#guestScanGradient)" />
        </Svg>
        <View style={{ position: 'absolute', top: -134, left: width / 2 - 172 }}>
          <Icon source={assets.blue} width={344} height={304} />
        </View>
        <View style={{ position: 'absolute', top: 48, left: -143 }}>
          <Icon source={assets.white1} width={321} height={286} />
        </View>
        <View style={{ position: 'absolute', top: 106, right: -130 }}>
          <Icon source={assets.white2} width={314} height={284} />
        </View>
        <View style={{ position: 'absolute', top: 487, left: width / 2 - 200 }}>
          <Icon source={assets.white3} width={401} height={306} />
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable
                style={styles.back}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Quay lại nhập thủ công"
                testID="guest.scan.back"
              >
                <Text style={styles.backText}>Quay lại</Text>
              </Pressable>
              <Text style={styles.title}>Quét mã QR vé</Text>
              <Icon source={assets.shield} width={24} />
            </View>
            <Text style={styles.subtitle}>Quét mã QR trên vé để tự động lấy mã vé</Text>
            <View style={styles.scanner}>
              <Text style={styles.scannerTitle}>
                {scanner.ticketCode ? 'Đã đọc được mã vé' : 'Quét vé điện tử của bạn'}
              </Text>
              <View style={styles.camera}>
                {cameraOn ? (
                  <CameraView
                    testID="guest.scan.camera"
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => scanner.onBarcode(data)}
                    onMountError={() => setCameraError(true)}
                  />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    {!permission?.granted && (
                      <>
                        <Text style={styles.permissionText}>
                          {permission?.canAskAgain === false
                            ? 'Camera đang bị tắt quyền. Bạn có thể bật trong Cài đặt.'
                            : 'Cho phép camera để quét mã QR trên vé.'}
                        </Text>
                        <Pressable
                          style={[styles.button, styles.primary]}
                          accessibilityRole="button"
                          testID="guest.scan.permission"
                          onPress={() => {
                            if (permission?.canAskAgain === false) void Linking.openSettings();
                            else void requestPermission();
                          }}
                        >
                          <Text style={styles.buttonText}>
                            {permission?.canAskAgain === false ? 'Mở cài đặt' : 'Cho phép camera'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                    {cameraError && (
                      <Text style={styles.permissionText}>
                        Không thể mở camera. Bạn có thể quay lại nhập thủ công.
                      </Text>
                    )}
                    {scanner.ticketCode && (
                      <Pressable
                        style={[styles.button, styles.primary]}
                        accessibilityRole="button"
                        onPress={() => {
                          setCameraError(false);
                          scanner.scanAgain();
                        }}
                      >
                        <Text style={styles.buttonText}>Quét lại</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                {cameraOn && (
                  <View pointerEvents="none" style={styles.overlay}>
                    <Icon source={assets.scan} width={120} />
                  </View>
                )}
              </View>
              <Text style={styles.scannerHint}>Đặt mã QR vào giữa khung hình</Text>
            </View>
            {scanner.error && (
              <Text style={styles.error} accessibilityRole="alert">
                {scanner.error}
              </Text>
            )}
            <View style={styles.card}>
              <View style={styles.row}>
                <Icon source={assets.ticket} width={20} />
                <Text style={styles.cardTitle}>Mã vé đã quét</Text>
              </View>
              <Text style={styles.description}>Mã vé sẽ tự động hiển thị sau khi quét QR.</Text>
              <View style={styles.codeField}>
                <Text style={styles.codeLabel}>Mã vé</Text>
                <TextInput
                  style={styles.code}
                  testID="guest.scan.ticketCode"
                  accessibilityLabel="Mã vé đã quét"
                  value={scanner.ticketCode}
                  placeholder="Chưa quét được mã vé"
                  placeholderTextColor="#7487A3"
                  editable={false}
                  selectTextOnFocus={false}
                />
              </View>
            </View>
            <Pressable
              style={[styles.button, styles.primary, !scanner.ticketCode && styles.disabled]}
              testID="guest.scan.check"
              accessibilityRole="button"
              accessibilityState={{ disabled: !scanner.ticketCode }}
              disabled={!scanner.ticketCode}
              onPress={() =>
                Alert.alert(
                  'Kiểm tra vé',
                  'Phần hiển thị kết quả vé sẽ được bổ sung ở bước tiếp theo.',
                )
              }
            >
              <Text style={styles.buttonText}>Kiểm tra vé</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.secondary]}
              testID="guest.scan.manual"
              accessibilityRole="button"
              onPress={onBack}
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>Quay lại nhập thủ công</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
