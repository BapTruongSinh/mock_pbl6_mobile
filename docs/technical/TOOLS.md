# Công cụ và thư viện của BLUE Mobile

Hướng dẫn cài/chạy: [README](../../README.md). Phiên bản cụ thể: [TOOLCHAIN.md](TOOLCHAIN.md), package.json và lockfile.

| Công cụ/thư viện | Mục đích |
| --- | --- |
| React Native + Expo Development Build | Giao diện Android và API native của app |
| TypeScript | Kiểu dữ liệu và hợp đồng frontend |
| Android Studio / SDK / Emulator / ADB | Build, cài APK, chạy và kiểm tra trên máy ảo |
| Metro | Đóng gói và gửi code JS/TS tới Development Build |
| React Navigation | Luồng màn hình theo role và hành động |
| Repository/mock fixtures | Dữ liệu mô phỏng và ranh giới để thay adapter API |
| TanStack Query / Zustand | Thư viện có sẵn trong dependency; tham chiếu callsite thực tế khi dùng, không mặc định toàn app đã dùng chung một cơ chế state |
| React Hook Form / Zod | Công cụ form và validation có trong dependency |
| Expo SecureStore / FileSystem | Phiên đăng nhập và dữ liệu local theo phạm vi tương ứng |
| Expo Camera | QR và quyền camera khi dùng tính năng |
| Expo Location + Open-Meteo | Vị trí foreground để lấy thời tiết; không theo dõi nền |
| Expo ImagePicker | Chọn/cắt avatar từ thư viện |
| MediaLibrary / ViewShot | Lưu ảnh vé kèm QR vào thư viện |
| Jest / React Native Testing Library | Test nghiệp vụ, repository và component |
| ADB screencap / UIAutomator | Chụp và kiểm tra giao diện Android thực tế |
| Figma | Nguồn thiết kế và asset chính thức lưu local |

Rule/skill/plan và bộ công cụ private của agent không phải dependency để người khác chạy app. Không cần cài các plugin agent chỉ để build, xem giao diện hoặc tích hợp API. Script kiểm thử trong scripts/ có thể cần công cụ native bổ sung theo nội dung từng script; README phân biệt rõ chạy app với chạy harness kiểm thử.
