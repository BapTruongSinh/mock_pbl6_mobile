# Toolchain — BLUE Mobile

Hướng dẫn cài đặt và chạy dùng chung: [README](../../README.md). Phiên bản package thực tế nằm trong package.json/pnpm-lock.yaml; không phụ thuộc thư mục hoặc tài khoản Windows của người phát triển.

| Thành phần | Phiên bản/cấu hình |
| --- | --- |
| Node | 24.x, engines >=24.3.0 <25; .node-version 24.22.0 |
| pnpm | 11.25.0, nodeLinker hoisted |
| Expo | 57.0.31, Development Build |
| React Native / React | 0.86.3 / 19.2.3 |
| TypeScript | 6.0.3, strict |
| Java | JDK 21, cấu hình JAVA_HOME theo máy đang sử dụng |
| Gradle | Wrapper 9.3.1 từ native project được sinh bởi Expo |
| Android | Compile/target API36; minSdk24; Build-Tools36.0.0 |
| NDK | 27.1.12297006 theo cấu hình React Native hiện tại |
| Emulator tham chiếu | Android14/API34, Google APIs x86_64; Pixel5/Resizable |

`android/` được sinh bằng Expo prebuild khi chưa có. SDK build lấy từ android/local.properties của từng máy; ADB lấy từ SDK Platform-Tools. Không commit local.properties hoặc cấu hình SDK cá nhân. Đọc Android SDK Location trong SDK Manager; có thể dùng ANDROID_HOME hoặc vị trí mặc định dưới LOCALAPPDATA trên Windows.

Cache/store dùng đường dẫn tương đối .cache/ trong pnpm-workspace.yaml; không đưa đường dẫn tuyệt đối của máy khác vào cấu hình. Android development APK cần Metro8081; sửa JS/TS thường cập nhật bằng Fast Refresh, thay đổi native cần build/cài lại.

Build Android và cài trên hai emulator đã được thực hiện ngày31/10/2026. Log/screenshot kiểm thử được lưu local trong artifacts/ và không đóng gói cùng source repo. Trạng thái tính năng và giới hạn hiện tại: [USER_REQUIREMENTS.md](USER_REQUIREMENTS.md), [SCREEN_FLOWS.md](SCREEN_FLOWS.md).
