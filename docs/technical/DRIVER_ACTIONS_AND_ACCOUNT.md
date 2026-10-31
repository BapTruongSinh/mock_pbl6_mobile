# Driver: xác nhận thao tác chuyến và tài khoản theo role

Cập nhật theo yêu cầu ngày 31/10/2026. Phạm vi frontend Mobile; repository, fixture và JSON local là mock của app. Không có BE, SQL hoặc API production.

## Xác nhận thao tác

Chi tiết chuyến → nút hành động → sheet xác nhận → Xác nhận → sheet đang gửi → kết quả repository. Quay lại / Android Back ở sheet xác nhận không thay đổi chuyến. Khi đang gửi không có nút hủy và không thể gửi thêm. Thứ tự bắt buộc: scheduled → boarding → travelling → arrived → completed. Vẫn kiểm tra đúng giờ xuất bến / đủ thời gian đến nơi ở UI và repository; mở sheet không bỏ qua time gate.

Intent giữ stage/version lúc mở xác nhận. Kết quả thành công mới đổi UI. Version cũ trả xung đột, sai stage trả không hợp lệ; mất quyền/phiên không tiếp tục thao tác. Nếu chưa rõ kết quả cập nhật, nút chính là tải lại trạng thái chuyến, không gửi lại ngay. Repository mock lưu thay đổi thành công theo tài khoản/chuyến; API thật cần server xác nhận và idempotency (xem API_HANDOFF).

| Node Figma | Trạng thái | Review case |
| --- | --- | --- |
| 1140:18 | Xác nhận bật đón khách | FIGMA-1140-18 |
| 1140:1041 | Đang mở đón khách | FIGMA-1140-1041 |
| 1140:92 | Xác nhận xuất bến | FIGMA-1140-92 |
| 1140:1113 | Đang ghi nhận xuất bến | FIGMA-1140-1113 |
| 1140:240 | Xác nhận đến nơi | FIGMA-1140-240 |
| 1140:1257 | Đang ghi nhận đến nơi | FIGMA-1140-1257 |
| 1140:314 | Xác nhận hoàn tất chuyến | FIGMA-1140-314 |
| Không có node được cung cấp | Đang ghi nhận hoàn thành, cùng style pending | NEW-DRIVER-COMPLETION-PENDING |
| 1140:1401 | Không thể chuyển trạng thái | FIGMA-1140-1401 |
| 1140:1474 | Chuyến vừa được cập nhật | FIGMA-1140-1474 |
| 1140:1547 | Chưa xác nhận cập nhật | FIGMA-1140-1547 |
| 1146:1196 | **Node thực tế là lỗi tải hồ sơ**, không phải hết phiên | FIGMA-1146-1196 |
| 1135:322 | Không có kết nối | FIGMA-1135-322 |
| Bổ sung theo yêu cầu nghiệp vụ | Hết phiên, nút đăng nhập lại | DRIVER-SESSION-EXPIRED |

Mở `bluemobile://debug/case/<case>`. Case dùng cùng component sản phẩm, fixture độc lập. Không tự sửa Figma để đổi nghĩa node 1146:1196.

## Quyền chỉnh sửa tài khoản

| Thông tin | Khách hàng | Driver |
| --- | --- | --- |
| Email | Sửa | Sửa |
| Số điện thoại | Sửa | Chỉ xem |
| Ngày sinh | Sửa | Chỉ xem |
| Tuổi | Tính từ ngày sinh | Tính từ ngày sinh, chỉ xem |
| Avatar | Chọn ảnh thư viện | Chọn ảnh thư viện |
| Mật khẩu | Đổi, kiểm tra mật khẩu hiện tại | Đổi, kiểm tra mật khẩu hiện tại |

Họ tên lấy từ hồ sơ đăng ký. Hồ sơ cũ chưa có điện thoại/ngày sinh hiển thị Chưa cung cấp, không tự tạo thông tin cá nhân. Tuổi không lưu thành field riêng để tránh lệch với ngày sinh. Ngày sinh nhập YYYY-MM-DD, kiểm ngày thực tế / không tương lai / từ 1900; ngày sai không lưu. Email và điện thoại kiểm định dạng và trùng tài khoản. Repository dùng role thật của tài khoản đã xác thực để chặn Driver sửa các field khóa, không chỉ disable input.

Đổi email/số điện thoại thành công cập nhật luôn định danh đăng nhập mock, bỏ định danh cũ và lưu JSON local; session hiện tại vẫn dùng account ID. Lưu thất bại rollback. Không có OTP/xác minh email thật; khi nối BE phải thống nhất chính sách xác minh/thu hồi phiên với người phụ trách BE. Không tự xem đây là contract production.

Review tài khoản: DRIVER-ACCOUNT và NEW-CUSTOMER-ACCOUNT; phải đăng nhập đúng role, không chuyển role bằng link. Logout về Login chung; role sau đăng nhập quyết định giao diện.

## File và geometry

- DriverTripActionSheet.tsx: modal sát đáy, nền dim rgba(16,35,63,.42), maxWidth 600dp, maxHeight 90%, bo góc trên 28dp, padding 24dp + bottom safe area; gap 14dp, handle 36×4dp, icon 20dp, title 16/24dp, copy 12/18dp, note 11/17dp, CTA minHeight 46dp / radius 14dp. Sheet cuộn khi nội dung/font lớn.
- useDriverTripDetail.ts: revalidation, time gate, typed outcome; DriverTripDetailScreen.tsx: intent/xác nhận/pending/error. DriverConnectionScreen.tsx: offline/expired/profile error; DriverDetailFrame.tsx: safe area/nav.
- AccountProfileForm.tsx: form dùng chung theo role; AccountScreen.tsx: avatar/password/logout; useAccount.ts: thao tác repository; DriverAccountScreen.tsx: điều hướng ba tab Driver.
- TravelRepository.ts / createMockRepository.ts / mockAuthStorage.ts: profile/dateOfBirth, validate quyền và persistence mock. createTestWorld.ts: adapter test.
- driverActionAssets.ts: require asset local theo node. Ledger artifacts/driver-actions/assets.json. Không runtime URL tạm, không screenshot-as-UI.

Kết quả kiểm thử thực tế: artifacts/driver-actions/VERIFICATION.md. Người dùng review cuối; không tuyên bố iOS, BE hay toàn ma trận accessibility đã đạt.
