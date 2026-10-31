# BLUE Mobile — sơ đồ và luồng màn hình hiện hành

Cập nhật theo source và yêu cầu đã chốt ngày 31/10/2026. Đây là luồng frontend mock, không chứng nhận API production. [Hướng dẫn chạy](../../README.md) · [Yêu cầu và quy tắc khóa/mở](USER_REQUIREMENTS.md).

## 1. Mở app, đăng nhập và Guest

```mermaid
flowchart TD
    Open[Mở app] --> Session{Phiên hợp lệ?}
    Session -->|Chưa có| Welcome[Welcome]
    Welcome -->|Bắt đầu hành trình| Login[Login chung]
    Session -->|Có| Role{Role tài khoản}
    Login -->|Đăng nhập đúng| Role
    Login -->|Sai thông tin| LoginError[Giữ Login và báo lỗi]
    LoginError --> Login
    Login -->|Đăng ký| Register[Register]
    Register -->|Đăng nhập| Login
    Register -->|Hợp lệ| Registered[Thông báo đăng ký thành công]
    Registered -->|Chọn Đăng nhập| Login
    Role -->|Customer| Home[Customer Home]
    Role -->|Driver| Driver[Driver Home]
    Login -->|Tiếp tục với tư cách khách| Guest[Guest Menu]
    Guest -->|Xem chuyến| Search[Tìm chuyến]
    Guest -->|Tra cứu vé| Lookup[Mã vé + SĐT đặt vé]
    Lookup -->|Hoặc quét QR| QR[Camera QR Guest]
    QR -->|Đọc được| Code[Tự điền mã vé]
    QR -->|Quay lại nhập thủ công| Lookup
    Lookup -.->|Kết quả chưa triển khai| PendingLookup[Chờ nối màn kết quả vé]
    Code -.-> PendingLookup
```

Login và Register giữ màn khi thiếu/sai thông tin. Đăng ký thành công hiện thông báo tại Register; không mô tả là tự chuyển trang nếu chưa có. Facebook/Google/Quên mật khẩu hiện mô phỏng, chưa tích hợp thật. Guest thủ công yêu cầu mã vé + SĐT, không OTP; QR không bắt nhập lại SĐT, nhưng màn kết quả Guest còn chờ.

## 2. Customer: tìm chuyến → đặt vé → vé của tôi

```mermaid
flowchart TD
    Home[Home] -->|Tìm chuyến / Xem tất cả| Search[Tìm chuyến]
    Search --> Filter[Bộ lọc]
    Filter -->|Áp dụng| Search
    Search -->|Chọn chuyến| Seats[Chọn ghế]
    Seats --> Auth{Đã đăng nhập Customer?}
    Auth -->|Chưa| Login[Login, giữ ghế và hạn hold]
    Login --> Passengers[Thông tin từng hành khách/ghế]
    Auth -->|Có| Passengers
    Passengers --> QR[VNPay QR mock - bước 1]
    QR -->|Tôi đã chuyển tiền| Processing[Chờ xác nhận - bước 2]
    QR -->|Hệ thống xác nhận| Ticket[Vé điện tử - bước 3]
    Processing -->|Hệ thống xác nhận| Ticket
    Ticket -->|Tải ảnh vé kèm QR| Gallery[Thư viện điện thoại]
    Ticket -->|Quay lại| Tickets[Vé của tôi]
    Nav[Tab Vé] --> Tickets
    Tickets -->|Chọn vé đã đặt| Ticket
```

- Bốn tab Customer: Trang chủ / Tìm kiếm / Vé / Tài khoản. Home avatar MA → Tài khoản.
- Booking dùng chung cho toàn bộ fixture chuyến; sơ đồ Nguyễn Kim 34 chỗ là mock tham chiếu. Mỗi ghế có tên/SĐT riêng, tối đa 6 ghế, giữ chỗ 10 phút.
- Nút Tôi đã chuyển tiền không xác nhận thanh toán thành công. Có nút development giả lập hệ thống xác nhận; QR không dùng chuyển tiền thật.
- Vé điện tử mở lại từ danh sách dùng cùng component vé sau thanh toán; Back không quay lại payment. Xuất ảnh PNG vé kèm QR vào thư viện; không gọi là PDF.
- Vé demo đang lưu theo bộ nhớ phiên, không cam kết giữ qua reload/logout.

## 3. Hủy vé và hoàn tiền

```mermaid
flowchart TD
    Ticket[Vé điện tử] -->|Hủy vé| Auth{Đăng nhập và có quyền?}
    Auth -->|Chưa đăng nhập| Login[Login]
    Auth -->|Có| Select[Chọn một hoặc nhiều ghế]
    Login --> Select
    Select -->|Không chọn| Disabled[Nút xem phí bị khóa]
    Select -->|Có chọn| Quote[Xem phí hoàn tiền]
    Quote -->|Xác nhận hủy| Cancelling[Chờ ghi nhận hủy - bước 1]
    Cancelling -->|Xác nhận đã hủy| Refunding[VNPay đang xử lý - bước 2]
    Refunding -->|Xác nhận đã hoàn| Refunded[Hoàn tiền thành công - bước 3]
    Refunded --> Tickets[Vé của tôi]
```

Ghế hủy sáng, ghế không hủy xám/ghi Không hủy. Hủy một phần giữ ghế còn lại; hủy toàn bộ làm QR hết hiệu lực. Màn khách dùng thông báo nghiệp vụ, không ghi “BE xác nhận”. Các xác nhận trên hiện do mock, chính sách phí chưa là contract production.

## 4. Driver: lịch chuyến và vận hành

```mermaid
flowchart TD
    Home[Driver Home] --> Schedule[Lộ trình]
    Schedule --> Today[Hôm nay]
    Schedule --> Upcoming[Sắp tới]
    Schedule --> History[Đã chạy]
    Today --> Detail[Thông tin chuyến]
    Upcoming --> Detail
    History --> DoneView[Xem chuyến đã hoàn thành]
    Detail --> Start[Đã lên lịch]
    Start -->|Bắt đầu đón khách| Confirm1[Xác nhận / Quay lại]
    Confirm1 -->|Xác nhận + kết quả thành công| Boarding[Đang đón khách]
    Boarding -->|Đủ giờ: xác nhận xuất bến| Confirm2[Xác nhận / Quay lại]
    Confirm2 -->|Ghi nhận thành công| Travelling[Đang di chuyển]
    Travelling -->|Đủ giờ và thời lượng: đến nơi| Confirm3[Xác nhận / Quay lại]
    Confirm3 -->|Ghi nhận thành công| Arrived[Đã đến nơi]
    Arrived -->|Hoàn thành chuyến| Confirm4[Xác nhận / Quay lại]
    Confirm4 -->|Ghi nhận thành công| Completed[Đã hoàn thành]
    Completed --> History
```

Mỗi Xác nhận đi qua màn đang gửi; chưa có kết quả thì không tự đổi trạng thái. Quay lại giữ nguyên; pending khóa gửi lặp. Chưa đủ giờ thì nút xuất bến/đến nơi bị khóa. Chưa hoàn thành chuyến hiện tại thì không bắt đầu chuyến khác. Nút giả lập đủ giờ chỉ phục vụ development review.

Lịch/chi tiết có loading, empty, lỗi tải/mất mạng, mất phân công. Invalid/conflict/uncertain có màn riêng và yêu cầu tải lại trạng thái trước khi gửi tiếp. Hết phiên → đăng nhập lại. Driver có ba tab Hôm nay / Lộ trình / Tài khoản, không có tab Soát vé.

## 5. Driver: danh sách khách → kiểm vé

```mermaid
flowchart TD
    Detail[Thông tin chuyến] --> Manifest[Danh sách hành khách]
    Manifest --> Filters[Lọc nhiều điểm đón + đã/chưa lên]
    Filters --> Manifest
    Manifest --> Gate{Trạng thái chuyến}
    Gate -->|Đã lên lịch| Locked[Chỉ xem, kiểm vé bị khóa]
    Gate -->|Đang đón / đang di chuyển| Check[Quét hoặc nhập mã vé]
    Gate -->|Đã đến nơi / hoàn thành| Hidden[Ẩn nút kiểm vé]
    Check --> Camera[Camera QR]
    Check --> Manual[Nhập thủ công]
    Camera --> Checking[Đang kiểm tra]
    Manual --> Checking
    Checking --> Success[Thành công: ghi nhận một lần]
    Checking --> Already[Đã soát: không tăng số khách]
    Checking --> Other[Sai chuyến / hủy / hoàn / đã dùng / mã sai]
    Checking --> Unknown[Chưa xác định kết quả]
    Unknown -->|Query operation cũ| Result[Kết quả đã ghi nhận]
    Success -->|Quay lại, tải lại| Manifest
    Already --> Manifest
```

Danh sách toàn bộ khách cuộn trong một khung riêng, không phân trang; tiêu đề/ghi chú/nút kiểm vé ngoài khung. Chưa lên có đồng hồ, đã lên có tích. Có loading, empty filter, lỗi tải, thay đổi cần refresh; stale khóa kiểm vé đến khi lấy revision mới. Mất quyền/phiên/phân công hoặc offline không được ghi nhận. Camera chỉ chạy ở màn quét foreground, có thể nhập thủ công khi không cấp camera.

## 6. Tài khoản và quyền

Home MA hoặc tab Tài khoản → Customer Account. Driver tab Tài khoản → Driver Account. Đổi ảnh → thư viện → chọn/cắt → lưu; hủy/lỗi giữ ảnh cũ. Đổi mật khẩu → kiểm mật khẩu hiện tại → lưu → dùng mật khẩu mới lần sau. Đăng xuất → xác nhận → Login chung.

| Field | Customer | Driver |
| --- | --- | --- |
| Email | Sửa | Sửa |
| SĐT | Sửa | Chỉ xem |
| Ngày sinh | Sửa | Chỉ xem |
| Tuổi | Tự tính từ ngày sinh | Tự tính, chỉ xem |
| Avatar / mật khẩu | Sửa | Sửa |

Thông tin thiếu hiện Chưa cung cấp. Profile/định danh được lưu mock local; không có OTP/email verification thật.

## 7. Review link và mapping tài liệu

Mở bằng `bluemobile://debug/case/<case>`, hoặc lệnh ADB ở README. Dùng đúng role và Development Build đã kết nối Metro. Các case dùng component sản phẩm với fixture độc lập, không có bản copy UI để sửa riêng.

| Nhóm | Ví dụ case | Chi tiết |
| --- | --- | --- |
| Welcome / Login / Register | FIGMA-650-4 / FIGMA-64-634 / FIGMA-64-638 | [REGISTER_SCREEN.md](REGISTER_SCREEN.md) |
| Guest | NEW-GUEST-MENU / NEW-GUEST-LOOKUP | [GUEST_SCREENS.md](GUEST_SCREENS.md), [GUEST_QR_SCREEN.md](GUEST_QR_SCREEN.md) |
| Home / tìm chuyến | FIGMA-31-2 / FIGMA-31-44 | [CUSTOMER_HOME.md](CUSTOMER_HOME.md), [SEARCH_RESULTS.md](SEARCH_RESULTS.md) |
| Đặt / thanh toán / vé | Theo registry booking | [BOOKING_NGUYEN_KIM.md](BOOKING_NGUYEN_KIM.md), [TICKETS_AND_DOWNLOAD.md](TICKETS_AND_DOWNLOAD.md) |
| Hủy / hoàn | Theo registry cancellation | [CANCELLATION_REFUND.md](CANCELLATION_REFUND.md) |
| Driver lịch / chi tiết | FIGMA-35-2 / FIGMA-1139-18 | [DRIVER_SCHEDULE.md](DRIVER_SCHEDULE.md), [DRIVER_TRIP_DETAIL.md](DRIVER_TRIP_DETAIL.md) |
| Driver khách / kiểm vé | FIGMA-1137-18 / FIGMA-996-102 | [DRIVER_MANIFEST_CHECKIN.md](DRIVER_MANIFEST_CHECKIN.md) |
| Driver xác nhận / lỗi | FIGMA-1140-18 và từng node riêng | [DRIVER_ACTIONS_AND_ACCOUNT.md](DRIVER_ACTIONS_AND_ACCOUNT.md) |
| Tài khoản | NEW-CUSTOMER-ACCOUNT / DRIVER-ACCOUNT | [DRIVER_ACTIONS_AND_ACCOUNT.md](DRIVER_ACTIONS_AND_ACCOUNT.md) |

Nguồn nối route: `src/navigation/RootNavigator.tsx`, `src/features/booking/BookingFlowScreen.tsx`, `src/features/driver/DriverScreen.tsx`, các file `src/testing/scenarios/`. Node 1146:1196 là **lỗi hồ sơ**, hết phiên là case bổ sung DRIVER-SESSION-EXPIRED; pending hoàn thành là NEW-DRIVER-COMPLETION-PENDING.

Khi thay đổi luồng, sửa cả sơ đồ và bảng hiện hành; không chỉ thêm đoạn lịch sử trái với dòng cũ. Chi tiết yêu cầu đã chốt và phần chưa triển khai nằm trong [USER_REQUIREMENTS.md](USER_REQUIREMENTS.md).


Bổ sung31/10: Home/Search chọn34tỉnh/thành và ngày bằng modal/lịch, Home truyền selection sang Search; bỏ mũi tên xuống. [Chi tiết picker và giới hạn mock](PROVINCE_DATE_PICKERS.md).
