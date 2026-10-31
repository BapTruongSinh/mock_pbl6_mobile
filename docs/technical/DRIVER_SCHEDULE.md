# Driver Home và lịch chuyến

Yêu cầu trực tiếp31/10/2026. Một app, một Login. Tài khoản demo `b@gmail.com`/`12345678`, role driver, tên Hoàng Nam theo Figma. Login role driver → DriverTrips; cold restore cũng dùng resolveEntry(driver), không đi qua CustomerHome. Tài khoản Customer không đọc được driverScheduleRepository.

## Mapping từng case

| Node Figma | Nội dung | Review link |
| --- | --- | --- |
| 35:2 | Chuyến của tôi/Home | bluemobile://debug/case/FIGMA-35-2 |
| 1160:18 | Lộ trình hôm nay | bluemobile://debug/case/FIGMA-1160-18 |
| 1136:18 | Sắp tới | bluemobile://debug/case/FIGMA-1136-18 |
| 1136:98 | Đã chạy | bluemobile://debug/case/FIGMA-1136-98 |
| 1136:178 | Đang tải | bluemobile://debug/case/FIGMA-1136-178 |
| 1136:247 | Chưa có chuyến | bluemobile://debug/case/FIGMA-1136-247 |
| 1136:318 | Lỗi tải lịch | bluemobile://debug/case/FIGMA-1136-318 |
| 1136:389 | Thu hồi phân công | bluemobile://debug/case/FIGMA-1136-389 |

## Code và dữ liệu

`src/features/driver/DriverScreen.tsx`: Home/Lộ trình/8case, card và bottom nav riêng Driver; `driver.styles.ts`: nativeStyleSheet, font token; `driverAssets.ts`: source chính thức theo node; `useDriverSchedule.ts`: loading/tab/network/retry/selected/revocation; `driverScheduleRepository.ts`: mock frontend typed, xác minh phiên qua TravelRepository, filter assignment. `src/testing/scenarios/driverScenarios.ts`: cùng component dùng review fixture, không bản sao UI.

Mock ngày28/08/2026 theo Figma: TR-204 TP.HCM→ĐàLạt11–17h, TR-218 ĐàLạt→NhaTrang18:30–22:30. Sắp tới dùngTR-218, Đã chạy dùngTR-204 trạng thái hoàn thành. Dữ liệu từng tab là fixture review độc lập, không trạng thái vận hành đồng thời thực tế; không giả gọi API. Tab gọi Sắp tới đúng Figma, chưa có datepicker/ngày mai riêng.

ExpoNetwork theo dõi kết nối foreground: mất kết nối/không reachable→ẩn list và hiện lỗi; Tải lại gọi loader, có loading, giữ lỗi nếu còn offline. Lỗi mock/empty/loading có link riêng. Trong development, nhấn giữ tiêu đề để mở bảng kiểm thử mock (không hiện mặc định); chọn trip → Thu hồi khi tải lại để kiểm trường hợp mất assignment khi đang xem. Reload xác minh selectedtrip vẫn thuộc assignment; nếu mất thì xóa selection/list, không hiển thị thông tin chuyến/hành khách, hiện1136:389. Nút về chuyến của tôi không phục hồi assignment đã bị thu hồi. Không có BE/check-in thật ở task này.

Bấm Xem thông tin chuyến hiện tóm tắt chuyến và nút tải lại để kiểm luồng thu hồi, là phần nối tối thiểu chưa tuyên bố dựng bộ TripDetail ngoài phạm vi. Soát vé sẽ được làm ở yêu cầu tiếp theo; không dùng camera Guest hoặc điều hướng sang Customer để giả Driver. Tab Tài khoản Driver hiện thông tin demo và Đăng xuất, không nav Customer.

## Asset và responsive

Figma fileKey OCkWSOZQ8Pq8AejXccajpO, session c0ca49df-5ba5-4c87-8e42-cec25f7870e7. Context+screenshot đủ8node, không sparse. `artifacts/driver/assets.json`: node/name/source/local SVG, PNG cùng tên là bản raster bằngResvg giữfilter blur; không URL tạm trong runtime. Asset static dùng đúng node; backgroundglows giữgeometry viewport390dp ở giữa, không kéo giãn blur theo chiều ngang.

Nền gradient fullwindow; SafeAreaView; nội dung width100%, max600dp, padding20. Header40/title16,date11; card radius22/padding18/gap10/time20/city14; connector108×17,pin/bus18; nav ở ngoàiScrollView,width100%/max600/radius22,minHeight80,padding8, không bị cuộn hoặc đẩy xuống. Body flex/space-between dựa chiều cao; màn thấp cuộn dọc; không khóa fontscale. Loading/error/empty/withdrawn vẫn giữ nav. Viewport evidence hai emulator, không tuyên bố kiểm đủ mọi thiết bị/iOS.

## Kiểm chứng

Test repository role/credentials/tab/revocation; hook offline→retry và selected assignment revoked clears data. Native evidence, ảnh Figma và kết quả từng case ở artifacts/driver. VERIFICATION.md ghi kết quả thực tế. Runtime auth mock lưu trên từng emulator, không đồng bộ thiết bị hoặc server.


## Thay thế phần tóm tắt sau triển khai chi tiết
Xem thông tin chuyến hiện mở DriverTripDetailScreen, không còn tóm tắt tối thiểu. Production Đã chạy lọc theo progress completed thực sự lưu local, không còn fixture TR204 hoàn thành mặc định; review1136:98 vẫn dùng fixture độc lập. Chi tiết DRIVER_TRIP_DETAIL.md. Ngày/giờ cố định Figma là dữ liệu mock, thời điểm đến nơi production khóa theo actual departure+duration.
