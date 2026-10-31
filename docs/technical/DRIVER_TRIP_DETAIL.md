# Chi tiết chuyến Driver

Yêu cầu31/10/2026: Home/Lộ trình → Xem thông tin chuyến → Chi tiết → Bắt đầu đón khách → Xác nhận xuất bến → Xác nhận đến nơi → Hoàn thành → xem lại từ Đã chạy.

## Mapping
1139:18 scheduled;35:28 boarding;1139:184 travelling;1139:267 arrived;1139:350 completed;1146:888 loading;1146:964 error;1146:1042 unavailable. Mỗi frame có link bluemobile://debug/case/FIGMA-NODE (đổi : thành -). Thêm DRIVER-DEPARTURE-LOCKED và DRIVER-ARRIVAL-LOCKED cho nút xám trước giờ. Cùng component sản phẩm, không copy UI. Review yêu cầu phiên Driver hợp lệ.

## File
DriverTripDetailScreen.tsx/DriverDetailFrame.tsx trong src/features/driver: giao diện, dùng driver.styles.ts và style chi tiết native; driverDetailAssets.ts map asset local đúng node. useDriverTripDetail.ts: tải, thời gian, thao tác/permission, foreground/network. driverTripRepository.ts: mock state machine và storage riêng app. DriverScreen.tsx: nối chọn chuyến; driverScheduleRepository.ts đồng bộ trạng thái vào lịch. src/testing/scenarios/driverDetailScenarios.ts chứa fixture riêng từng frame.

## Quy tắc
Chuyển tuần tự scheduled→boarding→travelling→arrived→completed, version kiểm optimistic concurrency và serialize mutation chống double tap. Boarding chỉ xuất bến khi now>=departureAt. Travelling chỉ đến nơi khi now>=max(arrivalAt,departedAt+plannedDuration), tránh xuất bến muộn rồi xác nhận đến ngay. Gate dùng Date/epoch đầy đủ với offset+07:00, không so chuỗi HH:mm. UI tự cập nhật trạng thái khóa mỗi giây, revalidate foreground và repository kiểm lại ngay khi submit. Thời gian production lấy đồng hồ thiết bị vì đang mock; BE sau này phải kiểm server time/version/assignment. Không coi client gate là bảo mật production.

Không bắt đầu boarding chuyến khác nếu còn chuyến boarding/travelling/arrived. Hoàn thành giữ dữ liệu và hiển thị lại Đã chạy, không reset scheduled. Không tự tăng số khách lên đủ34 khi hoàn thành; frame review completed fixture34/34, production giữ số khách thực tế mock13/34 cho đến khi có check-in.

Phiên/role/owner kiểm ở mỗi get/advance; mất phân công/notFound/session hết hạn/role khác→xóa trip trên UI, hiện1146:1042. Lỗi mạng/storage→error/retry, không báo cập nhật thành công. Logout/role change khi đang detail không hiển thị dữ liệu cũ. Không triển khai BE/SQL. Danh sách hành khách/soát vé chưa làm trong yêu cầu này, có thông báo thay vì fakecheckin.

## Mock và lưu
Catalog ngày28/08/2026 đúng Figma, không tự đổi sang hôm nay. TR218 điểm trả ngoàiframe204 được ghi rõ mock. Driver-HoàngNam là owner; JSON progress local documents/driver-trip-progress.v1.json phân tách key accountId:tripId, atomic temp→move. Ghi thất bại không mutate state. Không token/password/PII hành khách trong file. Development nhấn giữ tiêu đề để mở đồng hồ mô phỏng: trước giờ, đúng giờ xuất bến, đủ thời gian đến nơi; chỉnh giờ chỉ development và không sửa giờ hệ điều hành. Reviewfixture dùng storage riêng memory, không làm bẩn dữ liệu production. Quyền thu hồi mock in-memory; tích hợp thật phải dùng API.

## Responsive/asset
Nền fullwindow và glow390dp giữ blur không kéo ngang; content max600dp,padding20; SafeAreaView, nav nằm ngoài ScrollView. Card radius22,padding18,pass28vertical/stops29vertical,gap12; header16,time24,line36,city16,line24. Connector108x17; icons18/header20/shield24; state40. Nhãn và địa chỉ wrap, không tắt fontscale; màn thấp cuộn dọc. Nút disabled màu xám có accessibilityState và label rõ mốc mở.

Context/screenshot8node đã đọc, không sparse;113asset official localSVG/PNG giữblur. artifacts/driver-detail/assets.json và ảnh riêng mỗi case/hai emulator. VERIFICATION.md ghi kết quả thực tế sau kiểm tra.

Bản development có nút trực tiếp dưới CTA: “Giả lập đủ giờ xuất bến” / “Giả lập đủ giờ đến nơi”. Chỉ cập nhật đồng hồ mock, không tự xác nhận hoặc chuyển trạng thái; người review bấm nút xác nhận riêng sau đó. Không xuất hiện ở release.
