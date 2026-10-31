# Guest QR — quét mã vé

## Nguồn và thích nghi

Figma Travel v3, fileKey OCkWSOZQ8Pq8AejXccajpO, node1138:681. Context/screenshot đọc mới31/10/2026. Đây là frame Driver, người dùng yêu cầu thích nghi cho Guest: đổi Soát vé thành Quét mã QR vé, bỏ chuyến được giao và navigation Driver. Giữ gradient, glow, scanner navy, card trắng, icon chính thức, kích thước/corner/style. Card dưới đổi thành “Mã vé đã quét”, ô chỉ đọc. Nút dưới đổi thành “Quay lại nhập thủ công”. Không triển khai check-in hoặc lấy quyền Driver.

## Mapping và dữ liệu

- Route GuestScan → src/features/guest/GuestScanScreen.tsx → guestScan.styles.ts; logic đọc mã useGuestQrScanner.ts.
- GuestTicketLookupScreen onScanQr → navigation.navigate GuestScan. Cả header back và nút cuối → navigation.goBack, giữ màn nhập thủ công trong navigator thường.
- Dev review link bluemobile://debug/case/NEW-GUEST-SCAN, cùng component thật; scenario review reset dữ liệu khi chuyển case.
- CameraView từ expo-camera đã cài. Chỉ mount khi foreground, màn có focus, đã có quyền và chưa khóa kết quả; camera dừng khi nhận mã, blur/background/unmount.
- Quyền camera xin qua nút Cho phép camera; từ chối vĩnh viễn có Mở cài đặt và luôn có đường về nhập thủ công.
- Barcode callback → đọc ticketCode từ JSON mock hiện có, hoặc chuỗi mã A-Z/0-9/dấu gạch ngang3–64ký tự. Payload tối đa2048ký tự, không thực thi URL. Đây là kiểm định dạng phía client, không chứng minh vé hợp lệ hoặc xác thực chữ ký thật.
- Không có nhập tay trong ô mã đã quét: editable=false. Callback trùng bị khóa bằng ref; Quét lại mở lại camera và xóa mã.
- Kiểm tra vé chỉ hiện thông báo phần kết quả chưa triển khai. Không gọi API/lookup repository, không yêu cầu phone/OTP, không hủy/hoàn tiền/soát vé.

## Style và geometry

Manual lookup floating labels tại guest.styles.ts: nhãn absolute trên viền, nền trắng, cách trái12dp, top-8dp, padding ngang5dp; input vẫn editable.

Scanner: padding ngoài20dp, content width100% max480dp; header40dp; viewfinder padding20dp/radius24dp, camera cao225dp; card dưới padding18dp/radius22dp; nút min46dp/radius14dp. Nội dung dùng flex và ScrollView, fullwindow/safe-area, không khóa font scaling. Gradient gốc5stops; glow và icon tải local, không URL Figma tạm. Ledger node/local/callsite/rendered/checksum: artifacts/guest-ui/qr-assets.json. Screenshot/native evidence cùng thư mục guest-ui.

## Giới hạn kiểm chứng

Unit/integration kiểm QR callback tự điền, readonly, chặn trùng/URL, quay về thủ công. Native kiểm giao diện và navigation trên hai emulator. Không tuyên bố đã quét quang học QR thật qua camera emulator hoặc toàn bộ ma trận font/keyboard. Kết quả vé chưa thuộc phạm vi.

Nhãn Mã vé trong card mã đã quét dùng floating label trên viền trắng (top-8dp, left12dp, padding5dp), cùng quy tắc nhãn ở form thủ công.
