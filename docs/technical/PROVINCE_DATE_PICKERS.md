# Chọn tỉnh/thành và ngày đi

Home và Search: bấm điểm đi/đến mở danh sách34tỉnh/thành có tìm kiếm không dấu; bấm ngày mở lịch ngày/tháng/năm. Đóng không đổi lựa chọn; chọn tỉnh hoặc ngày thì đóng và cập nhật. Home truyền selection sang Search qua route params. Bỏ mũi tên xuống ở headerSearch. Lịch không cho chọn ngày quá khứ.

Nguồn danh mục hiện hành: [Nghị quyết202/2025/QH15](https://baochinhphu.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-102250612191145158.htm). Theo yêu cầu mới, selector, tiêu đề tuyến và nhãn mock đều dùng Lâm Đồng. Đây là thay đổi nhãn dữ liệu demo, không xác nhận tên bến xe thực tế. Mock chỉ có Hồ Chí Minh→Lâm Đồng; tuyến khác hiện empty, không đổi nhãn card để giả tuyến mới. Ngày truyền/hiển thị, chưa có catalog lịch chạy theo từng ngày hoặc API availability thật. Ngày ban đầu giữ fixture Figma28/08/2026; mở lịch từ tháng hiện tại nếu ngày đã qua.

File: src/shared/components/TripSearchPickers.tsx; src/features/home/CustomerHomeScreen.tsx; src/features/search/SearchResultsScreen.tsx; src/navigation/RootNavigator.tsx. Native StyleSheet/flex, modal maxWidth560dp/maxHeight85%,padding20/radius24, rowmin48dp, calendar7cột/cellmin44dp. Font token, không tắt scaling. 6testpicker/searchmodel+lint/typecheckđạt; evidence native trong artifacts/runtime-recovery. Không thêm dependency native; cập nhật bằng Metro.
