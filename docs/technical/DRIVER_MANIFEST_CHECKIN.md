# Driver: danh sách hành khách và kiểm tra vé

Phạm vi: frontend React Native Mobile, dữ liệu giả lập phía app. Không triển khai backend. Theo yêu cầu ngày 31/10/2026, đã bỏ tab Soát vé khỏi app Driver và 55 thanh Navigation trên trang Figma 7:10; chỉ giữ Hôm nay, Lộ trình, Tài khoản.

## Luồng và điều kiện mở kiểm tra vé

Chi tiết chuyến → Danh sách hành khách → Quét hoặc nhập mã vé.

- Chưa bắt đầu đón khách (`scheduled`): chỉ xem danh sách, nút kiểm tra vé bị vô hiệu hóa.
- Đang đón khách / đang chạy (`boarding`, `travelling`): được kiểm tra vé nếu còn quyền Driver, phân công chuyến và kết nối.
- Đã đến nơi / hoàn thành (`arrived`, `completed`): ẩn nút kiểm tra vé, chặn cả truy cập scanner đang mở.
- Chưa ghi nhận lên xe: icon đồng hồ; đã ghi nhận: dấu tích.
- Lọc một hoặc nhiều điểm đón, kết hợp trạng thái tất cả / chưa lên / đã lên. Dữ liệu giả lập có 34 khách, ban đầu 13 khách đã lên; hiển thị toàn bộ khách trong một khung cuộn riêng, không phân trang.
- Danh sách thay đổi: thông báo cần cập nhật và khóa kiểm tra vé cho đến khi tải revision mới. Nhấn giữ tiêu đề Hành khách trong development để hiện nút giả lập khách hủy vé.

## Camera và nhập thủ công

Chỉ xin quyền camera khi dùng tính năng. Từ chối hoặc lỗi camera vẫn có thể nhập thủ công; quyền bị chặn có nút mở cài đặt. Camera chỉ hoạt động khi màn quét đang ở foreground, dừng khi nhập mã, kiểm tra, xem kết quả hoặc mất quyền. Label mã vé nổi trên viền theo form đăng nhập.

QR nhận mã vé hoặc payload JSON có kiểm tra định dạng/chữ ký mock theo gateway hiện có; không thực thi URL. Đây chưa phải xác thực QR từ backend production.

Mỗi lần kiểm tra có operation ID, khóa callback lặp và mutation tuần tự. Kiểm tra trùng không tăng số khách. Nếu chưa rõ kết quả sau khi gửi, truy vấn lại operation cũ thay vì gửi thêm check-in. Lưu kết quả, thời điểm và revision vào JSON local theo tài khoản/chuyến; không ghi nhận khi mất mạng hoặc mất quyền. Khi quay về danh sách/chi tiết, số khách được tải lại.

Mã giả lập để review:

- `TVL-9K2C-7M4Q`: A02 hợp lệ; lần sau báo đã soát.
- `TVL-WRNG-0001`: sai chuyến.
- `TVL-CNCL-0001`, `TVL-RFND-0001`, `TVL-USED-0001`: đã hủy, hoàn tiền, đã dùng.
- Mã sai định dạng hoặc không tồn tại: không hợp lệ.
- `TVL-TIME-0001` (development): ghi nhận A03 rồi giả lập mất phản hồi; kiểm tra lại kết quả không ghi thêm lần nữa.

## Màn hình và link review

| Node | Case |
|---|---|
|1137:18|Manifestall|
|1137:100|Pickupfilter|
|1137:182|Pendingfilter|
|1137:264|Stale/cancelchange|
|1137:345|Loading|
|1137:422|Emptyfilter|
|1137:501|Error|
|996:102|QRscan|
|1138:681|Manual|
|1138:18|Checking|
|35:54|Success|
|1138:91|Already|
|35:78|Unknown|
|1138:165|Wrongtrip|
|1138:239|Cancelled|
|1138:313|Refunded|
|1138:387|Used|
|1138:461|Invalid|
|1138:535|Forbidden|
|1138:608|Offline|


Mở bằng `bluemobile://debug/case/FIGMA-<node thay dấu : bằng ->` khi có phiên Driver. Các case dùng cùng component sản phẩm, không phải bản sao UI. Ba case bổ sung: `MANIFEST-READONLY`, `MANIFEST-ARRIVED`, `MANIFEST-COMPLETED`. Fixture review độc lập với dữ liệu app; trạng thái chưa lên ở frame 1137:182 có bộ khách riêng.

## Mapping file và thông số giao diện

| File trong src/features/driver | Trách nhiệm |
| --- | --- |
| DriverManifestScreen.tsx, driverManifest.styles.ts | Danh sách, bộ lọc, khung cuộn, các trạng thái |
| useDriverManifest.ts | Load, revision, network, quyền và refresh |
| driverManifestRepository.ts | Mock storage, lọc, kiểm tra quyền/stage, check-in idempotent |
| DriverCheckInScreen.tsx, useDriverCheckIn.ts | Camera, form nhập, xử lý và kết quả |
| ManifestComponents.tsx, driverManifestAssets.ts | Component dùng chung và asset local |
| DriverDetailFrame.tsx | Header, nền, ba tab cố định, safe area |
| DriverTripDetailScreen.tsx, useDriverTripDetail.ts | Mở danh sách, đồng bộ số khách |

Scenario: `src/testing/scenarios/driverManifestScenarios.ts` (20 frame + 3 gate). Native StyleSheet, TypeScript strict, PascalCase component và camelCase biến/hook; không áp dụng CSS BEM cho React Native.

Padding ngang 20dp, nội dung tối đa 600dp căn giữa và nền phủ toàn màn hình. Card bo 22dp, padding 16dp; ô ghế 40×34dp, icon trạng thái 20dp. Tiêu đề 16dp, tuyến 20dp, nội dung 12dp; CTA tối thiểu 46dp. Khung camera cao 324dp, icon quét 90dp, input nổi cao 54dp. Bộ lọc modal tối đa 500dp, padding 22dp. Font Be Vietnam Pro theo token; cho phép cuộn dọc và font scaling. Thanh điều hướng nằm ngoài vùng cuộn.

255 asset SVG chính thức có bản PNG giữ filter/blur, tải từ exact node về local. Ledger: `artifacts/driver-manifest/assets.json`; không dùng URL Figma tạm lúc runtime. Việc bỏ tab Soát vé không xóa tiêu đề của màn kiểm tra vé.

Kiểm chứng và giới hạn thực tế: `artifacts/driver-manifest/VERIFICATION.md`. Chưa kết nối BE, chưa xác nhận quét QR vật lý end-to-end hoặc iOS; không coi ảnh review là chứng nhận pixel-perfect.


Cập nhật theo review: khung khách cuộn dọc độc lập (`nestedScrollEnabled`), cao 38% chiều cao cửa sổ, giới hạn 220–400dp. Tiêu đề và ghi chú nằm ngoài vùng cuộn; đổi bộ lọc đưa danh sách về đầu. Nút kiểm vé và thanh điều hướng không nằm trong danh sách.
