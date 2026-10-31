# Capture & Calibration Contract — BLUE Mobile

Tài liệu quy định hợp đồng chuẩn hóa thiết bị Android, chụp ảnh màn hình (`capture:case`), kiểm chứng hình học (`test:visual:case`), bố cục đa kích thước/cỡ chữ (`test:layout:case`), và trợ năng (`test:a11y:case`) cho toàn bộ 87 active cases của BLUE Mobile.

## 1. Biến môi trường & Cache Scoped theo Process (`TOOLCHAIN.md`)

Mọi lệnh CLI và script trong `scripts/*.mjs` chỉ đặt biến môi trường trong phạm vi tiến trình con, tuyệt đối không dùng `setx` hoặc sửa cấu hình toàn máy:

- `JAVA_HOME`: `C:\Program Files\Java\jdk-21` (JDK `21.0.8`)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`: SDK của máy đang dùng (Android SDK Location trong SDK Manager)
- `NPM_CONFIG_CACHE`: `.cache\npm`
- `COREPACK_HOME`: `.cache\corepack`
- `PNPM_HOME`: `.cache\pnpm-home`
- `GRADLE_USER_HOME`: `.cache\gradle`

## 2. Canonical Viewport & Responsive Profiles

- **Canonical Figma Canvas:** `390×844` logical dp, `fontScale = 1.0`.
- **Canonical Test Harness Profile (`--profile canonical`):**
  - `wm size 390x844`
  - `wm density 160` (`1px = 1dp`, không biến dạng tỷ lệ khung hình / không anisotropic scaling)
  - `settings put system font_scale 1.0`
  - Ẩn hoàn toàn thanh hệ thống Android 14 (`WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())` qua tham số deep link `?hideBars=1` kết hợp `policy_control`) và tắt hoàn toàn nút nổi `Tools` của `expo-dev-menu` (`EXDevMenuShowFloatingActionButton=false`, ẩn/gỡ `ExpoDevMenuFragment`) để ảnh chụp đạt đúng `390×844` thuần ứng dụng, không bị đè bởi đồng hồ thanh trạng thái hay nút công cụ phát triển.
- **Responsive Portrait Matrix (`test:layout:case`):**
  - Chiều rộng (`width`): `320`, `360`, `390`, `412`, `480` dp (chiều cao chuẩn `844` dp, thêm `640` dp cho kịch bản bàn phím/cuộn/modal).
  - Cỡ chữ (`fontScale`): `1.0`, `1.3`, `2.0`.
  - Kịch bản bổ sung: bàn phím mở (`keyboard`), văn bản/địa chỉ dài (`longtext`), và thanh hệ thống hiển thị thực (`systembars` với `?hideBars=0`).

## 3. Khôi phục Trạng thái Thiết bị (`finally` & Recovery Manifest)

1. Trước khi áp dụng bất kỳ override nào qua `adb`, script lưu trạng thái gốc (`physicalSize`, `overrideSize`, `physicalDensity`, `overrideDensity`, `fontScale`, `policyControl`) vào `artifacts/.device-recovery.json`.
2. Nếu tiến trình trước bị ngắt đột ngột, lần chạy kế tiếp đọc `artifacts/.device-recovery.json` và khôi phục thiết bị trước khi thực hiện thao tác mới.
3. Trong khối `finally` của mọi lệnh (`capture:case`, `test:layout:case`, `test:native:case`, `test:a11y:case`), script khôi phục lại toàn bộ thông số thiết bị (`wm size`, `wm density`, `font_scale`, `policy_control`, và `?hideBars=0`) và đọc ngược lại từ `adb` để xác nhận đã hoàn nguyên, kể cả khi test hoặc negative-control bị lỗi.

## 4. Dev Harness Deep Link, Maestro Invocation & Bảo mật Production

- **Dev Deep Link:** `bluemobile://debug/case/<CASE_ID>`
- Chỉ hoạt động khi ứng dụng chạy ở chế độ phát triển (`__DEV__ === true` và `isProduction !== true`).
- Ở bản build production, `parseHarnessDeepLink` từ chối mọi liên kết `debug/case/*` với mã `production-mode-blocked`.
- **Maestro Native Runner (`test:native:case`):** Gọi trực tiếp `java.exe` với mảng tham số (`shell: false`, không nối chuỗi `shell: true`, không sinh cảnh báo Node `[DEP0190]`) cùng cờ UTF-8 (`-Dfile.encoding=UTF-8`, `-Dsun.stdout.encoding=UTF-8`, `-Dsun.stderr.encoding=UTF-8`) để bảo toàn nguyên vẹn tiếng Việt có dấu trong log kiểm thử.

## 5. Cấu trúc Artifact, Kiểm chứng Contamination & Trợ năng Trung thực (`artifacts/<CASE>/`)

- `reference.json`: `fileKey`, `nodeId`, `frame`, `contextDate`, `sourceStatus`, `viewport`, `font`, `insets`.
- `figma.png`: Ảnh chụp chuẩn từ Figma node (hoặc hợp đồng hình học cho case `test-harness-derived`).
- `geometry.json`: Tọa độ và kích thước chuẩn (`x`, `y`, `width`, `height`, `toleranceDp`) của các phần tử neo (`anchor`, `logo`, `card`, `cta`).
- `implementation.png` & `meta.json`: Ảnh chụp thực tế từ thiết bị cùng thông số đo đạc (`physicalSize`, `density`, `logicalCanvas`, `fontScale`, `systemBars`, `insets`, `crop`, `unexpectedOverlayNodes`, `capturedAt`).
- `visual-report.json`: Kiểm chứng tọa độ neo (`<= 2dp`), kích thước PNG, đồng thời kiểm tra cả cây phân cấp UIAutomator (`unexpected-overlay-contamination`) lẫn điểm ảnh PNG (`canvas-pixel-contamination` và `anchor-obstructed-by-system-ui`) để từ chối mọi ảnh chụp bị lẫn nút nổi `Tools` hoặc thanh trạng thái/điều hướng hệ thống.
- `layout-report.json`: Kiểm chứng 17 cấu hình kích thước/cỡ chữ trên thiết bị thật, phát hiện chồng lấp (`sibling-overlap`), tràn khung (`element-clipped-or-out-of-bounds`), hoặc overlay lạ.
- `a11y-report.json`:
  - Ghi nhận trung thực trạng thái dịch vụ TalkBack từ `settings get secure enabled_accessibility_services` (`talkBackServiceEnabled`, `talkBackVerified: false` khi TalkBack không bật trên emulator; mọi tuyên bố `talkBackVerified: true` khi dịch vụ không chạy đều bị đánh trượt với mã `unsubstantiated-talkback-claim`).
  - Xác minh điều hướng tiêu điểm bàn phím thật (`KEYCODE_TAB` -> `keyboardFocusVerified: true`, `focusedNodeId` phải rơi vào phần tử tương tác như `foundation.toggle`) và chuyển đổi trạng thái sau chạm (`Sẵn sàng` -> `Đã chạm`).
  - Xác minh `observableRole` dựa thuần túy trên thuộc tính `className` thực tế của Android `AccessibilityNodeInfo` (`android.widget.Button` -> `button`, `android.widget.ImageView` -> `image`, `android.widget.TextView` -> `text`, `android.view.View` -> `view`), ghi chú rõ giới hạn tuần tự hóa XML của `uiautomator dump` đối với `accessibilityRole="summary"` mà không tự suy diễn role từ `testID`.

## Sol Task2 rework — actual native evidence (2026-10-30)

Native `MainActivity` debug telemetry writes app-private `foundation-window-metrics.json` from `WindowManager.currentWindowMetrics` and `decorView.rootWindowInsets`: window bounds in pixels, density, resource font scale, visible system-bar insets and bar visibility. Capture/layout accept only telemetry matching the active size/density/font profile; missing or stale telemetry fails. No preset inset fallback qualifies as measured evidence.

Actual native fault controls use production-blocked harness deep links (`nativeFault=anchor-offset|overlap|missing-label`). Runners receive `--native-fault <fault>`; they render and capture the faulty native UI before evaluating it. Legacy `--fault-*` switches remain comparator-only tests and are reported separately. A clean deep link and each runner's finally restoration clear temporary faults. The full remote URI is shell-quoted so `&` cannot truncate the Android query.

`android:smoke` requires before/after persisted snapshot proof and an increasing cold-launch count. It also invokes a debug-only dedicated private-file failed-save probe: a real Expo native move onto the nonempty documents directory must reject, no save acknowledgement occurs, the previously committed snapshot remains byte-identical and reloads, and a written temp file proves replacement was reached. This probe uses dedicated files and does not mutate the runtime repository snapshot.

Recovery retains its manifest until size/density/font (including nullable raw setting), policy, immersive confirmation and animation settings match. Native/layout/a11y/smoke runners fail when restoration cannot be verified. TalkBack traversal and speech remain unverified; keyboard focus, observable native roles/labels, target dimensions and native tap state change are recorded separately.
