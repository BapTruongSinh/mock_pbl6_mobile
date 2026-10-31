# Danh sách Vé và tải ảnh

31/10/2026: frame635:45 làm chuẩn style danh sách: nền gradient, tiêu đề Vé của tôi, count, tabs Tất cả/Sắp tới/Đã đi, card trắng radius22 bóng7/18, footer4tabs theo override người dùng. Dữ liệu hiện lấy vé mock đã phát hành của account, không giả hiển thị3vé nếu chỉ đặt1đơn. JourneyStatus mock quyết định lọc sắp tới/đã đi, không suy từ ngày hệ thống vì fixture chuyến đang dùng28/08/2026.

MyDemoTicketsScreen.tsx -> chọn card -> TicketScreen.tsx dùng chung với kết quả thanh toán. Back chi tiết -> danh sách. Back từ BookingFlow sau issued -> onNavigate(tickets) -> DemoTickets, không quay payment. Review link bluemobile://debug/case/FIGMA-635-45; fixture1đơn2ghế riêng, không chèn vào account thật.

TicketScreen có Tải ảnh vé kèm QR và Tải riêng mã QR. DownloadableTicket.tsx dựng vé ngang1100dp theo ảnh tham khảo người dùng: logo chính thức, hành trình, giờ, hãng, ghế, tên, điểm đón/trả, QR và mã vé. Render offscreen native collapsable=false; react-native-view-shot capture PNG, expo-media-library/legacy lưu thư viện; không chụp screenshot cả màn/UI. QR dùng cùng payload hiện tại. Android29+ lưu qua MediaStore không xin đọc toàn bộ thư viện; iOS/Androidcũ xin quyền ghi khi bấm tải. Lỗi báo rõ, cleanup file tạm sau mỗi lần lưu, chặn nhấn lặp khi saving. Không có PDF ở phiên bản này; ảnhPNG phù hợp xuất thư viện điện thoại.

Native5554 đã bấm tải vé, MediaStore DCIM ghi file, pull về artifacts/booking/exported-ticket.png và nhìn kiểm tra đủ nội dung/QR. Native5556 danh sách kiểm tra tại emulator-5556-export.png.10test booking/list/export PASS, typecheck/lint PASS. Vé vẫn mock bộ nhớ account, chưa persistence qua restart/BE/VNPaythật; không tuyên bố QRmock dùng thực tế.

Native QR riêng cũng đã lưu MediaStore và pull thành artifacts/booking/exported-qr.png.

Thông báo lưu vé/QR dùng AppNotice (src/shared/components/AppNotice.tsx): scrim xanh đậm, card trắng bo28, icon thành công/xử lý lỗi, tiêu đề/nội dung riêng, nút xác nhận50dp. Android back đóng modal; cùng component cho cả2luồng tải.
