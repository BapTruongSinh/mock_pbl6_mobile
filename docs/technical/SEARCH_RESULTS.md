# Tìm chuyến và bộ lọc Mobile

Nguồn chuẩn: Travel-v3 file OCkWSOZQ8Pq8AejXccajpO, frame 31:44 (390×844) và 486:279. Context/screenshot chính thức đã đọc ngày 31/10/2026. Chỉ frontend, dữ liệu demo local; không có API/SQL hoặc tồn chỗ thật.

## Mapping

| Route/case | Component | File style | Dữ liệu/hành vi |
|---|---|---|---|
| SearchResults / FIGMA-31-44 | SearchResultsScreen, TripCard | src/features/search/search.styles.ts | searchModel.ts |
| Modal / FIGMA-486-279 | SearchFilterSheet | cùng file style | draft riêng, apply mới cập nhật |

File đều dưới src/features/search. Asset chính thức local tại src/shared/assets/search; ledger artifacts/search/assets.json. PNG glow/background được raster từ SVG Figma để Android giữ blur và không cắt nền trên màn rộng. SVG ticket giữ hình gốc, crop vùng shadow ngoài viewBox (18,11,350,154), không dùng screenshot làm UI.

## Geometry và responsive

Chuẩn Figma 390dp: lề20, card350×154 tối thiểu, khoảng12; header route, filter và catalog xếp flex; catalog44 tối thiểu; bottom-nav lề16, bo18. Nền full window, content tối đa600dp và căn giữa trên tablet, danh sách cuộn dọc. Text không tắt font scaling; card có thể cao hơn khi wrap. Sheet rộng toàn vùng content tối đa600, bo góc28, handle52×4, hàng52 tối thiểu/gap6, footer50 tối thiểu; max-height theo window và safe-area, nội dung dài cuộn. Không cố định tọa độ toàn màn.

## Logic

12 chuyến mock, 4 chuyến đầu theo nội dung Figma; 8 chuyến bổ sung ghi MOCK ID. Catalog15 loại xe, không có kết quả cho loại chưa có fixture là hợp lệ. Các điều kiện AND: buổi (00–11:59 /12–17:59 /18–23:59), giờ chính xác HH:mm, loại xe, nhà xe, điểm đón, điểm trả và khoảng giá bao gồm hai biên. Sắp xếp giờ tăng/giảm, giá tăng/giảm. Số chuyến tính từ danh sách thật. Đóng/back không apply draft. Đặt lại xóa draft, bấm Áp dụng để cập nhật. Giờ sai/giá ngược chặn áp dụng. Không có kết quả có nút xóa bộ lọc.

## Luồng và review

Home → tab Tìm kiếm / Xem tất cả → SearchResults. Login → tiếp tục khách → Xem chuyến → SearchResults (không bắt đăng nhập ở bước xem). Bộ lọc hoặc catalog → modal → chọn điều kiện → Áp dụng → kết quả. Chọn chuyến chỉ thông báo lựa chọn; chưa dựng chọn ghế/đặt vé/thanh toán.

Review cùng component sản phẩm:
- bluemobile://debug/case/FIGMA-31-44
- bluemobile://debug/case/FIGMA-486-279

Kiểm thử: pnpm test --runInBand src/features/search src/features/guest/guest.test.tsx; pnpm typecheck; pnpm lint. 9 test liên quan PASS; không suy diễn full matrix hoặc iOS đã pass. Evidence native: artifacts/search/emulator-5554-* và emulator-5556-*.

Kết quả native cuối: màn tìm kiếm đã hiển thị đầy đủ asset trên5554 và5556. Bộ lọc/apply nhà xe BLUE ra3 kết quả đã xác minh5556. Tự động tap trên5554 không ổn định nên chưa xác nhận trọn luồng apply ở thiết bị này; không gộp thành PASS hai thiết bị. Full suite142/143; test Login responsive cũ fail width400 so với expected<=310, file Login không thay đổi ở công việc này.
