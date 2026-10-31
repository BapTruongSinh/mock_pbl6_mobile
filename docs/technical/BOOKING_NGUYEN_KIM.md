# Đặt vé Nguyễn Kim và thanh toán VNPay mock

Phạm vi: frontend React Native Mobile, không có giao dịch/thanh toán hoặc xác nhận ngân hàng thật.

## Nguồn thiết kế và route

| Case | Frame | Component | Route |
| --- | --- | --- | --- |
| Chọn ghế 34 chỗ | 31:89 | SeatMapScreen | BookingFlow |
| Thông tin từng hành khách | 37:127 | PassengerScreen | BookingFlow |
| QR VNPay, bước 1 | Mới, theo style31:172 | PaymentScreen | BookingFlow |
| Chờ đối soát, bước 2 | 31:172 | PaymentScreen | BookingFlow |
| Vé điện tử, bước 3 | 31:183 | TicketScreen | BookingFlow / DemoTickets |

Figma file OCkWSOZQ8Pq8AejXccajpO. Thông tin chuyến được thích nghi sang NK118 Nguyễn Kim 10:30–16:45,380.000đ/ghế; hai ghế760.000đ. Không giữ số tiền660.000đ hoặc hãng BLUE Express mẫu khi dữ liệu chuyến khác. Logo BLUE là thương hiệu ứng dụng.

File logic: src/features/booking/bookingModel.ts; UI/style: booking.styles.ts; flow: BookingFlowScreen.tsx; QR local: LocalQr.tsx. Asset gốc trong src/shared/assets/booking, PNG dẫn xuất từ SVG để giữ hình/blur trên Android; không dùng screenshot làm UI. Shared navigation: src/shared/components/CustomerBottomNav.tsx, bốn mục Trang chủ/Tìm kiếm/Vé/Tài khoản. Header Home chỉ còn MA bên phải, không chuông/badge.

## Luồng

SearchResults → bấm NK118 → chọn ghế (17 dưới A +17 trên B). Ghế đã có người/đang giữ không được chọn; tối đa6; chọn lại bỏ ghế. Hold10phút từ lần chọn đầu, không reset khi Login. Tìm chuyến/xem ghế không cần đăng nhập; Tiếp tục sau chọn ghế bắt Login nếu chưa là customer; đăng nhập xong vẫn giữ ghế.

Hành khách → mỗi ghế một dòng → bấm dòng để nhập họ tên và số điện thoại10số bắt đầu0 → Lưu. Phải điền đủ tất cả ghế. Đổi điểm đón/trả bằng picker mock. Tiếp tục → QR VNPay.

Bước1 QR demo sinh local, không chứa tài khoản nhận tiền và không thể thanh toán thật. Nút Tôi đã chuyển tiền → bước2 chờ. Chỉ event confirmed mô phỏng hệ thống mới sang bước3; có nút giả lập hệ thống trong panel riêng cho review. Hệ thống có thể confirmed ngay từ bước1, bỏ qua bước2. Không biến lời khai đã chuyển thành thành công; confirmation lặp không tạo thêm vé. Hết hold chặn tiếp tục/xác nhận.

Vé thành công dùng đúng ghế, tên, số điện thoại, điểm đón/trả và tổng tiền đã chọn. Vé mock lưu bộ nhớ theo account trong demoTicketRepository.ts, xem lại bằng tab Vé; mất khi app khởi động lại, xóa khi logout. Chưa nối API, chưa xác minh QR vé với repository tra cứu/chức năng driver hiện có. QR vé là dữ liệu mock, không vé hợp lệ ngoài đời.

## Responsive và geometry

Content tối đa600dp, nền fullwindow, SafeArea, dọc cuộn. Ghế48dp khi đủ rộng; hàng cuối5ghế co theo window ở màn nhỏ. Card chọn ghế min508dp; header58dp; summary dưới màn có CTA50dp. Passenger lề28dp, cardmin590dp; nội dung tự tăng theo số ghế/font; editor keyboard tránh che input. Ticket card radius28/padding18; thẻ dữ liệu2cột flexwrap; QR và địa điểm có thể xuống hàng. Hình khuyết trong suốt, bóngnative tách khỏi nền PNG để không tô đen góc.

## Review

Các deep link dùng cùng component sản phẩm với fixture2ghếB01/B02:
- bluemobile://debug/case/FIGMA-31-89
- bluemobile://debug/case/FIGMA-37-127
- bluemobile://debug/case/NEW-VNPAY-QR
- bluemobile://debug/case/FIGMA-31-172
- bluemobile://debug/case/FIGMA-31-183

Review fixture có thể xem không Login, không lưu vé vào tài khoản; luồng thật BookingFlow vẫn yêu cầu customer Login. Tất cả thông tin hành khách trong fixture là giả.

## Kiểm chứng

16 test liên quan booking/search/guest PASS, typecheck/lint/format kiểm tra ở artifacts/booking. Test tích hợp: 2ghế→2form→QR→đã chuyển→processing→confirmed→ticket; guest Login giữ ghế; tab4mục đúng1active; model chặn ghế bận,max6,holdhết,confirmationlặp.
Native evidence và logs lưu artifacts/booking; chỉ những case được chụp/kiểm tra thật mới tính đã xem, không suy diễn từ CLI exit0. Không tuyên bố iOS đã kiểm chứng.
## Sửa luồng dùng chung31/10/2026

TabVé phải hoạt động cả khi đang active ở màn detail. CustomerBottomNav hiện luôn gọi onNavigate nếu có; MyDemoTicketsScreen nhận tickets để bỏ selected và về list; BookingFlow issued gọi tickets -> DemoTickets. Mọi reviewHome/Search cũng trỏ FIGMA-635-45, không bypass list.

Tất cả12SearchTrip hiện vào cùngBookingFlow qua route.params.tripId. BookingState giữtrip; bookingTrip cung cấp hãng/giờ/loại/giá, seatsForTrip tạo tổng sốchỗ theo catalog mock (giường2tầng, ghếngồi1tầng). Mọi passenger/payment/ticket/download/list dùng cùngtrip. Không cố địnhNK380k khi chọnBLUE320k/ThànhBưởi350k/PhươngTrang300k. Giới hạn6,hold10phút,Login/passenger/QR/chờ/confirmed không đổi. Sơ đồ xe khác chưa cóFigma được coi mock minh họa, không contract thực tế của hãng. ReviewSearch truyềntripId được chọn, không épNK.

19testbooking/searchPASS, lint/typecheckPASS. Reviewlist5556đã chụp artifacts/booking/emulator-5556-ticket-nav.png. Haiemulator được cập nhậtMetro. Người dùngreview tiếp.
