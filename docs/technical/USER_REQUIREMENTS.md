# Yêu cầu người dùng — BLUE Mobile

Bản diễn giải dễ đọc các yêu cầu đã chốt trong cuộc trao đổi, cập nhật 31/10/2026. Không phải bản chép nguyên văn prompt; không chứa API key hoặc thông tin nhạy cảm. Phạm vi chỉ Mobile, không trộn yêu cầu FE Desktop/BE. Quyết định mới thay thế quyết định cũ được ghi rõ dưới đây.

Đọc cùng [SCREEN_FLOWS.md](SCREEN_FLOWS.md) và [README](../../README.md). “Đã có” nghĩa đã triển khai frontend mock, không có nghĩa đã tích hợp API production. Phần còn chờ không được tự xem là hoàn tất.

## 1. Mục tiêu và giao diện

- Một app React Native/TypeScript phục vụ khách hàng đặt vé xe và tài xế vận hành chuyến.
- Dùng chung màn đăng nhập, tự điều hướng theo role từ tài khoản. Không có nút chọn role và không đi qua giao diện Customer khi tài khoản là Driver.
- Đối chiếu exact frame Figma Customer `7:6`, Driver `7:10`, file Travel v3. Mỗi loading/empty/error/modal/kết quả là case riêng.
- Logo, icon, ảnh có trong Figma phải lấy asset chính thức về local; không giả logo bằng chữ BLUE hay thay ảnh/icon riêng bằng emoji.
- Màn chưa có Figma được làm theo style hiện có và ghi rõ là phần bổ sung: Guest menu/lookup, VNPay QR, một số bước hoàn tiền, tài khoản mở rộng, hết phiên và pending hoàn thành.
- Responsive theo kích thước cửa sổ, nền phủ chiều ngang; chiều dọc dài thì cho cuộn. Không bó toàn app vào một ảnh cố định hoặc để chữ chồng nhau. Thanh công cụ cố định ngoài vùng cuộn, tôn trọng safe area.

## 2. Mở app, đăng nhập và Guest

| Tình huống | Quy tắc đã chốt | Hiện trạng |
| --- | --- | --- |
| Mở app chưa có phiên | Welcome 650:4 → Bắt đầu hành trình → Login | Đã có |
| Có phiên hợp lệ | Vào giao diện đúng role | Đã có |
| Sai tài khoản/mật khẩu | Giữ Login, hiện lỗi | Đã có |
| Tiếp tục với tư cách khách | Mở màn có hai nút Tra cứu vé / Xem chuyến | Đã có |
| Guest chọn Xem chuyến | Vào tìm chuyến; được xem/chọn chuyến/chỗ | Đã có |
| Guest tiếp tục đặt/thanh toán | Bắt đăng nhập sau chọn chỗ, giữ lựa chọn và hạn giữ chỗ | Đã có mock |
| Guest tra thủ công | Phải đúng mã vé **và SĐT đặt vé**, không OTP | Có form/validation; màn kết quả chưa nối |
| Guest quét QR | Camera đọc mã, tự điền mã vào ô chỉ đọc; không bắt nhập lại SĐT | Có màn quét; kết quả vé chưa nối |
| Guest quay lại nhập thủ công | Trở lại form mã vé + SĐT | Đã có |
| Hủy vé / hoàn tiền | Phải đăng nhập và có quyền sở hữu vé | Đã có mock Customer |

Label mã vé/SĐT nằm trên viền khung bo tròn như form Login. Nút back của màn quét có nội dung dễ hiểu, không để thành ô trống. Facebook/Google/Quên mật khẩu hiện là mô phỏng/thông báo, chưa là tích hợp thật.

## 3. Customer: Home và tìm chuyến

- Tài khoản demo ban đầu `a@gmail.com` / `12345678`, tên Minh Anh.
- Home bỏ chuông và badge thông báo; avatar MA ở góc, bấm mở Tài khoản.
- Thanh công cụ chỉ: **Trang chủ / Tìm kiếm / Vé / Tài khoản**; bỏ Hành trình.
- Nút đổi điểm đi/đến phải nằm giữa và nổi lên, không bị các ô che. Bỏ bộ lọc Gần bạn trong gợi ý hành trình.
- Nền sáng phía sau là quầng blur hòa vào nền, giữ tỉ lệ khi màn rộng, không thành vòng sắc nét hoặc bị kéo dãn.
- Thời tiết: xin vị trí foreground khi sử dụng; đồng ý và có vị trí thì lấy Open-Meteo, từ chối/lỗi/GPS không khả dụng thì **--°C · ---**, vẫn dùng app. Quyết định hiện hành không theo dõi nền và không đóng app vì từ chối vị trí.
- Tìm kiếm 31:44 và filter 486:279 dùng dữ liệu mock; lọc có tác dụng khi áp dụng. Các lõm/góc card dùng đúng nền phía sau, không tô đen; card có bóng theo Figma.

## 4. Chọn chỗ, hành khách và thanh toán

| Trường hợp | Hành vi |
| --- | --- |
| Chọn chuyến mock | Luồng đặt vé áp dụng cho toàn bộ fixture chuyến, không chỉ Nguyễn Kim |
| Xe Nguyễn Kim 34 chỗ | Sơ đồ hai tầng, thông tin chuyến/giá truyền xuyên suốt |
| Chọn nhiều ghế | Mỗi ghế có thông tin tên và SĐT hành khách riêng; chọn từng ghế để nhập |
| Giới hạn | Tối đa 6 ghế, giữ chỗ 10 phút; đăng nhập không reset hạn giữ |
| Thanh toán | Chỉ VNPay; QR trong demo là mô phỏng, không chuyển tiền thật |
| Bước 1 | Hiện QR và chờ xác nhận hệ thống |
| Bấm Tôi đã chuyển tiền | Chuyển bước 2 chờ xử lý, **không** coi là thanh toán thành công |
| Hệ thống xác nhận | Từ bước 1 hoặc 2 sang bước 3 xuất vé; hiện dùng nút giả lập |

Không đưa thuật ngữ triển khai BE/SQL vào thông báo khách hàng. Giao dịch chỉ hoàn tất sau kết quả xác nhận; frontend không tự coi thao tác bấm nút là đã thanh toán.

## 5. Vé, tải vé và hủy/hoàn tiền

- Tab Vé mở **Vé của tôi** 635:45. Chọn vé đã đặt mới mở Vé điện tử.
- Vé sau thanh toán và vé mở lại từ danh sách dùng cùng màn/component; không dựng một bản copy để sửa riêng.
- Vé điện tử có **Tải ảnh vé kèm QR** vào thư viện điện thoại. Xuất định dạng vé ngang theo mẫu; bản hiện tại là ảnh PNG, không ghi là đã có PDF.
- Nút quay lại trên vé điện tử về danh sách Vé của tôi, không vòng về thanh toán.
- Đổi nút tải riêng QR thành **Hủy vé**. Các thông báo, gồm mục Đã đi/empty, dùng style chung.

| Điều kiện hủy | Nút / hành vi |
| --- | --- |
| Chưa chọn vé/ghế nào | Xem phí hoàn tiền bị xám, không bấm |
| Chọn một hoặc nhiều ghế | Cho xem phí hoàn tiền của các ghế đó |
| Xem phí | Ghế hủy giữ sáng; ghế không hủy xám và ghi Không hủy |
| Xác nhận hủy | Bước 1 chờ ghi nhận hủy; chưa xác nhận thì không nhảy bước |
| Đã ghi nhận hủy | Bước 2 VNPay đang xử lý |
| Provider xác nhận hoàn tiền | Bước 3 thông báo hoàn tiền thành công |
| Hủy một phần | Các ghế còn lại vẫn dùng được |
| Hủy toàn bộ | QR vé hủy không còn hợp lệ |
| Vé đã đi/không đủ điều kiện | Không mở thao tác hủy như vé đang hợp lệ |

Phí và thời hạn hoàn tiền trong fixture là mock theo thiết kế, không phải chính sách production đã xác nhận. Khi nối API phải chờ phản hồi thật; hiện chỉ mô phỏng phía app.

## 6. Driver: đăng nhập và lịch chuyến

- Tài khoản ban đầu `b@gmail.com` / `12345678`, Hoàng Nam, role Driver.
- Đăng nhập vào Driver Home 35:2; Hôm nay / Sắp tới / Đã chạy có danh sách riêng.
- Có loading, không có lịch, lỗi tải/mất mạng và bị thu hồi phân công khi tải lại.
- Chỉ xem/vận hành chuyến được giao; mất phân công hoặc mất role không tiếp tục hiển thị dữ liệu cũ để thao tác.
- Thanh công cụ chỉ **Hôm nay / Lộ trình / Tài khoản**. Đã bỏ tab Soát vé ở app và các Navigation Figma Driver; việc này không xóa màn kiểm vé bên trong chuyến.

## 7. Driver: trạng thái chuyến — cái nào khóa, cái nào mở?

| Trạng thái hiện tại | Hành động kế tiếp | Điều kiện / giới hạn |
| --- | --- | --- |
| Đã lên lịch | Bắt đầu đón khách | Còn quyền/phân công; mở sheet xác nhận trước |
| Đang đón khách | Xác nhận xuất bến | Chỉ sáng khi đủ giờ xuất bến; chưa đủ giờ bị khóa |
| Đang di chuyển | Xác nhận đến nơi | Chỉ sáng khi đủ giờ và thời lượng theo chuyến |
| Đã đến nơi | Hoàn thành chuyến | Xác nhận trước khi hoàn tất |
| Đã hoàn thành | Về danh sách / xem lại lịch sử | Không chạy lại thao tác chuyển trạng thái; được nhận chuyến khác |

- Không bỏ bước. Chưa hoàn thành chuyến đang chạy thì không bắt đầu chuyến khác.
- Mỗi hành động có **Xác nhận / Quay lại**. Quay lại giữ nguyên; chỉ Xác nhận mới gửi cập nhật.
- Đang gửi: nút bị khóa, không gửi lặp và không tự coi là thành công.
- Sai trạng thái: báo Không thể chuyển trạng thái, tải lại để biết hành động hợp lệ.
- Chuyến vừa thay đổi: báo Chuyến vừa được cập nhật, tải lại trước thao tác tiếp.
- Chưa rõ kết quả cập nhật: kiểm tra trạng thái đã ghi nhận trước khi gửi lại.
- Hết phiên: yêu cầu đăng nhập lại; mất mạng: thông báo và thử kết nối lại.
- Bản development có nút giả lập đủ giờ để review; không bỏ time gate trong luồng thật.
- Link người dùng gọi là “hết phiên” `1146:1196` thực tế là lỗi tải hồ sơ trong Figma. App có cả màn đúng node và case hết phiên bổ sung riêng.

## 8. Driver: danh sách hành khách và kiểm vé

| Điều kiện | Danh sách | Quét / nhập mã |
| --- | --- | --- |
| Chưa bấm bắt đầu đón khách | Được xem | Khóa, nút xám |
| Đã bắt đầu đón / đang di chuyển | Được xem/lọc | Được mở trong danh sách hành khách |
| Đã đến nơi / hoàn thành | Được xem lại | Ẩn nút, chặn scanner đang mở |
| Danh sách có thay đổi/hủy vé | Báo cần cập nhật | Khóa cho đến khi tải revision mới |
| Mất role/phân công/phiên | Không để thao tác trên dữ liệu cũ | Chặn kiểm vé |
| Mất mạng | Hiện lỗi, có thử lại | Không ghi nhận check-in offline |

- Toàn bộ khách nằm trong **một khung cuộn dọc riêng**, không phân trang bốn người. Tiêu đề, ghi chú, nút kiểm vé và thanh công cụ ngoài khung cuộn.
- Khách chưa ghi nhận có icon đồng hồ; đã lên có dấu tích.
- Lọc một/nhiều điểm đón để biết khách ở điểm nào; kết hợp lọc đã lên/chưa lên. Có loading, empty filter, lỗi tải và danh sách cần cập nhật.
- QR và nhập thủ công đi qua cùng kiểm tra. Camera chỉ xin quyền khi dùng, từ chối vẫn nhập thủ công; không chạy camera nền.
- Chờ kiểm tra không gửi lặp. Thành công cập nhật khách đã lên và số khách; quét lại không tăng số lượng.
- Có kết quả riêng: thành công, đã soát, chưa rõ kết quả, sai chuyến, đã hủy, đã hoàn tiền, đã dùng, mã không hợp lệ, mất quyền và mất kết nối.
- Kết quả chưa rõ: query operation cũ trước khi quét/gửi lại. Không thực thi URL tùy ý từ QR.

## 9. Quyền chỉnh sửa tài khoản mới nhất

| Trường / chức năng | Customer | Driver |
| --- | --- | --- |
| Họ tên | Hiển thị từ đăng ký | Hiển thị từ hồ sơ |
| Email | Cho sửa | Cho sửa |
| SĐT | **Cho sửa** | **Không cho sửa** |
| Ngày sinh | Cho sửa | Không cho sửa |
| Tuổi | Tự tính từ ngày sinh | Tự tính, chỉ xem |
| Avatar | Chọn từ thư viện | Chọn từ thư viện |
| Mật khẩu | Đổi với mật khẩu hiện tại | Đổi với mật khẩu hiện tại |
| Đăng xuất | Có xác nhận, về Login | Có xác nhận, về Login |

Quy tắc Driver bị khóa phải kiểm cả ở repository, không chỉ đổi màu input. Dữ liệu cũ thiếu ngày sinh/SĐT hiện Chưa cung cấp; không tự bịa dữ liệu. Đổi email/SĐT cập nhật định danh đăng nhập mock và lưu local; tuổi không lưu độc lập để tránh lệch ngày sinh. Chọn ảnh bị hủy hoặc lưu lỗi giữ ảnh cũ; thông tin lưu lỗi rollback.

## 10. Cách làm việc và tài liệu

- Chỉ sửa Mobile; không sửa BE/Desktop/template gốc hoặc cấu hình toàn máy để làm UI.
- Dùng TypeScript, quy tắc tên dự án và StyleSheet/token native; không áp CSS/BEM/DOM của web vào React Native.
- Ghi flow, mapping route/component/file/asset và thông số layout để agent/người sau hiểu.
- Kiểm tra trước báo cáo; cập nhật app lên emulator để người dùng thấy đúng bản mới. Không chỉ báo dựa trên lời Worker hoặc test baseline cũ.
- Theo quyết định làm việc mới nhất: agent triển khai trực tiếp, người dùng review; các runbook Worker/plan cũ là lịch sử, không tự kích hoạt lại.
- Giữ Metro/emulator chạy giữa các lượt; chỉ khởi động lại khi có lỗi/treo thật. Khi chạy tác vụ nặng theo yêu cầu trước đó, kiểm CPU và chạy tuần tự; không poll CPU liên tục.
- Không tự init Git, push hoặc merge. Không đưa API key, token hay dữ liệu thật vào tài liệu.

## 11. Những phần không được hiểu nhầm đã có production

- Guest kết quả tra cứu vé chưa nối UI, dù form và camera đã có.
- VNPay/thanh toán/hủy/hoàn/kiểm vé hiện dùng mock, không giao dịch tiền thật hoặc dispatch thật.
- Email/SĐT chưa có xác minh OTP/email thật. Bàn giao API cần người phụ trách BE thống nhất.
- Vé đặt demo hiện theo bộ nhớ phiên, có thể mất khi reload/logout; profile và tiến độ chuyến Driver có storage local riêng. Không cam kết tất cả dữ liệu cùng persist.
- Camera preview đã chạy trên emulator; chưa chứng nhận quét QR vật lý xuyên suốt/iOS/toàn bộ cỡ chữ và thiết bị.
- Plan đã viết hoặc review link tồn tại không có nghĩa mọi mục trong plan đã hoàn thành.

Chi tiết kỹ thuật: [DRIVER_ACTIONS_AND_ACCOUNT.md](DRIVER_ACTIONS_AND_ACCOUNT.md), [DRIVER_MANIFEST_CHECKIN.md](DRIVER_MANIFEST_CHECKIN.md), [API_HANDOFF.md](API_HANDOFF.md). Nếu triển khai thay đổi mới, cập nhật file này và flow, không chỉ thêm một dòng lịch sử mâu thuẫn.


Bổ sung31/10: Home/Search chọn34tỉnh/thành và ngày bằng modal/lịch, Home truyền selection sang Search; bỏ mũi tên xuống. [Chi tiết picker và giới hạn mock](PROVINCE_DATE_PICKERS.md).


### Điều chỉnh tài khoản và nhập liệu (31/10/2026)

- Xác nhận đăng xuất có hai nút cân đối: Ở lại (trung tính), Đăng xuất (đỏ). Đang xử lý thì khóa cả hai nút; áp dụng Customer và Driver dùng chung màn hình tài khoản.
- Nội dung mẫu ở form đăng ký là placeholder màu nhạt; nội dung đã nhập giữ màu chữ chính.
- Test tiếng Việt bằng bàn phím ảo Android. Người dùng xác nhận nhập đ hoạt động; không yêu cầu thay cấu hình bộ gõ PC.
