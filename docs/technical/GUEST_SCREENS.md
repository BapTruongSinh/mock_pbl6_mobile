# Guest menu và nhập tra cứu vé

Hai màn mới không có frame Figma riêng; thiết kế theo style Login64:634/Register64:638 hiện có: nền trắng, logo BLUE chính thức, Be Vietnam Pro, semantic token, CTA đen và nút phụ xanh nhạt. Không gán node Figma giả.

## Luồng và phạm vi

Login → Tiếp tục với tư cách khách → GuestMenu (Tra cứu vé / Xem chuyến) → Tra cứu vé → GuestTicketLookup (mã vé + số điện thoại đặt vé, nút Tra cứu vé, nút Hoặc quét QR).

Quay lại: Lookup → Menu → Login. Không đăng nhập, không OTP. Xem chuyến hiện thông báo chưa triển khai. QR đã được bổ sung theo yêu cầu mới, xem GUEST_QR_SCREEN.md. Tra cứu thủ công mới kiểm tra đủ ô và thông báo bước tiếp theo, không trả vé giả, không gọi repository/API. Kết quả vé vẫn chưa triển khai.

## Mapping

| Route | Component | Style / xử lý |
|---|---|---|
| GuestMenu | src/features/guest/GuestMenuScreen.tsx | guest.styles.ts, GuestScreenLayout.tsx |
| GuestTicketLookup | src/features/guest/GuestTicketLookupScreen.tsx | guest.styles.ts, GuestScreenLayout.tsx, useGuestLookupForm.ts |

- Variables: ticketCode, bookingPhone. Chưa handoff endpoint BE; chỉ input phía FE.
- Navigation: src/navigation/RootNavigator.tsx. Review scenarios: src/testing/scenarios/guestScenarios.ts, render cùng component thật.
- Logo: src/shared/assets/brand-blue-logo.png, cùng asset official Login; rendered84x26dp, contain, cả hai màn.
- Theme: src/shared/theme/tokens.ts; không CSS/BEM hoặc thư viện icon thay asset.

## Layout

App phủ cửa sổ, safe-area; ScrollView dọc. Card width100%, max480dp, lề ngoài16dp, padding24dp; logo84x26dp; tiêu đề23sp, mô tả11sp; nút menu min64dp, tra cứu min52dp, QR min48dp; radius16dp. Không khóa chiều cao text hoặc tắt font scaling. Geometry đo thực tế theo screenshot pixel lưu artifacts/guest-ui/geometry.json; không coi là tọa độ Figma.

## Kiểm tra

Typecheck/lint đạt.15tests Guest+Login+Register đạt (Guest3). Native thực thi cả5554/5556: bấm Guest từ Login, thấy2nút, bấm Tra cứu vé, thấy2input và QR; evidence artifacts/guest-ui/native-flow.json cùng XML/PNG. Đã xem screenshot điện thoại và Resizable. Chưa tuyên bố chạy toàn bộ font/keyboard matrix. Người dùng review giao diện cuối.

Nhãn Mã vé/Số điện thoại đặt vé đã đổi sang floating label trên viền trắng, cùng phong cách Login.
